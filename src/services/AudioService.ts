
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";
import util from "util";
import { v4 as uuidv4 } from "uuid";

export class AudioService {
    private client: TextToSpeechClient;
    private outputDir: string;

    constructor() {
        this.client = new TextToSpeechClient();
        // Ensure public/audio exists
        this.outputDir = path.join(process.cwd(), "public", "audio");
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async generateAudio(text: string): Promise<string> {
        // Construct the request
        const request = {
            input: { text: text },
            // Select the language and SSML voice gender (optional)
            voice: { languageCode: "en-US", name: process.env.AUDIO_VOICE || "en-US-Journey-F" },
            // select the type of audio encoding
            audioConfig: { audioEncoding: "MP3" as const },
        };

        // Performs the text-to-speech request
        const [response] = await this.client.synthesizeSpeech(request);

        if (!response.audioContent) {
            throw new Error("No audio content received from Google TTS");
        }

        const filename = `${uuidv4()}.mp3`;
        const filepath = path.join(this.outputDir, filename);

        // Write the binary audio content to a local file
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filepath, response.audioContent, "binary");

        return `/audio/${filename}`;
    }
}

export const audioService = new AudioService();


