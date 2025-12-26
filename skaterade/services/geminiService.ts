import { GoogleGenAI } from "@google/genai";
import { FilterConfig, FilterType } from "../types";

const SYSTEM_INSTRUCTION = `
You are a skate-video FFmpeg assistant.

You will always receive a single JSON object as input. It has this shape:

{
  "action": "generate_ffmpeg_command",
  "camera_style": "<string camera preset id>",
  "options": {
    "grainIntensity": <number 0..1>,
    "vignetteIntensity": <number 0..1>,
    "saturationBoost": <number -1..1>,
    "contrastBoost": <number -1..1>,
    "whiteBalance": <number -1..1>,
    "addTimestamp": <boolean>,
    "speedRamp": {
      "isEnabled": <boolean>,
      "startTime": <number seconds>,
      "endTime": <number seconds>,
      "speed": <number multiplier>
    }
  },
  "source_type": "ea_skate" | "real",
  "input_path": "<input filename, e.g. input.mp4>",
  "output_path": "<output filename, e.g. output.mp4>",
  "ffmpeg_command": "<starter ffmpeg command suggested by the app>"
}

Your job is to return a JSON object with a refined FFmpeg command that matches the requested camera style and options.

You MUST follow these rules:

- ALWAYS respond with VALID JSON only. No commentary, no backticks.
- JSON shape MUST be:

  {
    "ffmpeg_command": "<single-line ffmpeg command>",
    "notes": "<short explanation of the look you applied>"
  }

- ffmpeg_command must start with "ffmpeg" and end with the output_path from the input JSON.
- **RESOLUTION RULE**: The output video MUST be scaled to **1920x1080** (HD 1080p). 
  - Use a filter chain like \`scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2\` to ensure the video fits within the 16:9 frame with black bars if necessary (pillarbox/letterbox), preserving aspect ratio. 
  - Do NOT stretch the video.
- Put all video look changes into the -vf filter chain using filters like: scale, format, eq, noise, vignette, gblur, fps, colorbalance, etc.
- Respect the sliders:
  - grainIntensity: 0..1 → translate to noise amount.
  - vignetteIntensity: 0..1 → vignette strength.
  - saturationBoost: -1..1 → adjust eq saturation.
  - contrastBoost: -1..1 → adjust eq contrast.
  - whiteBalance: -1..1 → adjust color temperature (cool/blue to warm/orange). Use curves or colorbalance/eq.
- Handle Speed Ramp:
  - If speedRamp.isEnabled is true, you MUST apply speed changes using 'setpts' in the complex filter or simple filter chain. 
  - Example logic: Split the video into 3 parts (pre-ramp, ramp, post-ramp) using 'trim' and 'setpts', then 'concat' them. Or use a complex 'setpts' expression if suitable. 
  - Speed < 1.0 means slow motion (higher PTS duration). Speed > 1.0 means fast forward.
- Use camera_style to pick the vibe:
  - "vx1000_fisheye": VX1000 SD skate look, punchy, crunchy, with vignette.
  - "vx1000_vertical": same VX look but safe for vertical 9:16 without cropping the trick.
  - "vhs_handycam": soft, noisy, low contrast, slight blur, color bleed.
  - "vhs_timestamp": same as vhs_handycam plus VHS-style timestamp overlay in the notes.
  - "dvx100_film": warm indie-film SD, 24p feel, softer detail.
  - "hvx200_hd": clean HD mid-2000s, cooler shadows, subtle grain.
  - "dslr_modern": sharp modern HD/4K, gentle contrast, fine grain.

If you are unsure, prefer simple, correct FFmpeg commands using common filters.
Return ONLY the JSON object described above.
`;

export const generateFFmpegCommand = async (
  config: FilterConfig, 
  filename: string = "clip.mp4"
): Promise<{ command: string; notes: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Map internal FilterType to the prompt's expected keys
    let cameraStyle = "dslr_modern";
    if (config.type === FilterType.VX1000) cameraStyle = "vx1000_fisheye";
    if (config.type === FilterType.VHS) cameraStyle = config.addTimestamp ? "vhs_timestamp" : "vhs_handycam";
    if (config.type === FilterType.DVX100) cameraStyle = "dvx100_film";

    const payload = {
      action: "generate_ffmpeg_command",
      camera_style: cameraStyle,
      options: {
        grainIntensity: config.grainIntensity,
        vignetteIntensity: config.vignetteIntensity,
        saturationBoost: config.saturationBoost,
        contrastBoost: config.contrastBoost,
        whiteBalance: config.whiteBalance,
        addTimestamp: config.addTimestamp,
        speedRamp: config.speedRamp
      },
      source_type: "ea_skate",
      input_path: filename,
      output_path: `processed_${filename}`,
      ffmpeg_command: "ffmpeg -i input.mp4 -vf 'scale=1920:1080...' output.mp4"
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: JSON.stringify(payload),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      },
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        return {
            command: data.ffmpeg_command,
            notes: data.notes
        };
    }
    
    throw new Error("No response from Gemini");

  } catch (error) {
    console.error("Error generating FFmpeg command:", error);
    return {
        command: "ffmpeg -i input.mp4 output.mp4",
        notes: "Error communicating with AI service. Defaulting to copy."
    };
  }
};