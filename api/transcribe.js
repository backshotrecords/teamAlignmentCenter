const OPENAI_TRANSCRIPTIONS_URL =
  "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-1";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

function sendCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  sendCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const {
      apiKey: rawApiKey,
      audioBase64,
      mimeType = "audio/webm",
      fileName = "dictation.webm",
    } = req.body || {};
    const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";

    if (!apiKey) {
      return res.status(400).json({ error: "Add an OpenAI API key in settings." });
    }

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "No audio recording was received." });
    }

    const outgoingFormData = new FormData();
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const audioBlob = new Blob([audioBuffer], {
      type: mimeType,
    });

    outgoingFormData.append("file", audioBlob, fileName);
    outgoingFormData.append("model", WHISPER_MODEL);
    outgoingFormData.append("response_format", "json");

    const openAiResponse = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: outgoingFormData,
    });
    const payload = await openAiResponse.json().catch(() => null);

    if (!openAiResponse.ok) {
      return res.status(openAiResponse.status).json({
        error:
          payload?.error?.message ||
          "OpenAI returned an error while transcribing the recording.",
      });
    }

    return res.status(200).json({ text: payload?.text || "" });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "The transcription request failed.",
    });
  }
}
