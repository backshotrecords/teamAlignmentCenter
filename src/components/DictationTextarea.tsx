import { Loader2, Mic, Square } from "lucide-react";
import {
  ChangeEvent,
  TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { transcribeAudio } from "../lib/api";

interface DictationTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  apiKey: string;
  value: string;
  onChangeText: (value: string) => void;
  onDictationError: (message: string) => void;
  onMissingApiKey: () => void;
}

function getPreferredMimeType(): string | undefined {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return options.find((option) => MediaRecorder.isTypeSupported(option));
}

function getExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}

function insertTranscript(
  value: string,
  transcript: string,
  start: number,
  end: number,
): string {
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    return value;
  }

  const before = value.slice(0, start);
  const after = value.slice(end);
  const needsLeadingSpace =
    before.length > 0 && !/[\s\n]$/.test(before) ? " " : "";
  const needsTrailingSpace = after.length > 0 && !/^[\s\n.,;:!?]/.test(after)
    ? " "
    : "";

  return `${before}${needsLeadingSpace}${cleanTranscript}${needsTrailingSpace}${after}`;
}

export function DictationTextarea({
  apiKey,
  className,
  onChangeText,
  onDictationError,
  onMissingApiKey,
  value,
  ...textareaProps
}: DictationTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const valueRef = useRef(value);
  const selectionRef = useRef({ start: value.length, end: value.length });
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function rememberSelection(): void {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    rememberSelection();
    onChangeText(event.target.value);
  }

  async function startRecording(): Promise<void> {
    if (!apiKey.trim()) {
      onMissingApiKey();
      return;
    }

    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      onDictationError("Voice input is not supported in this browser.");
      return;
    }

    rememberSelection();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void transcribeRecording(recorder.mimeType || mimeType || "audio/webm");
      };
      recorder.start();
      setRecordingState("recording");
    } catch {
      onDictationError("Microphone access was blocked or unavailable.");
      setRecordingState("idle");
    }
  }

  async function transcribeRecording(mimeType: string): Promise<void> {
    setRecordingState("transcribing");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    try {
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });

      if (!audioBlob.size) {
        throw new Error("No audio was captured.");
      }

      const audioFile = new File(
        [audioBlob],
        `dictation.${getExtension(mimeType)}`,
        { type: mimeType },
      );
      const { text } = await transcribeAudio(apiKey, audioFile);
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? selectionRef.current.start;
      const end = textarea?.selectionEnd ?? selectionRef.current.end;
      const nextValue = insertTranscript(valueRef.current, text, start, end);

      onChangeText(nextValue);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (caughtError) {
      onDictationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Voice transcription failed.",
      );
    } finally {
      chunksRef.current = [];
      recorderRef.current = null;
      setRecordingState("idle");
    }
  }

  function stopRecording(): void {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function handleMicClick(): void {
    if (recordingState === "recording") {
      stopRecording();
      return;
    }

    if (recordingState === "idle") {
      void startRecording();
    }
  }

  const isBusy = recordingState !== "idle";

  return (
    <div
      className={`dictation-field ${
        isBusy ? "dictation-field--active" : ""
      }`.trim()}
    >
      <textarea
        {...textareaProps}
        ref={textareaRef}
        className={className}
        value={value}
        onBlur={rememberSelection}
        onChange={handleChange}
        onClick={rememberSelection}
        onKeyUp={rememberSelection}
        onSelect={rememberSelection}
      />
      <button
        className={`dictation-button dictation-button--${recordingState}`}
        type="button"
        title={
          recordingState === "recording"
            ? "Stop recording"
            : "Record voice input"
        }
        aria-label={
          recordingState === "recording"
            ? "Stop recording"
            : "Record voice input"
        }
        disabled={recordingState === "transcribing"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleMicClick}
      >
        {recordingState === "transcribing" ? (
          <Loader2 className="spin" size={17} />
        ) : recordingState === "recording" ? (
          <Square size={15} />
        ) : (
          <Mic size={17} />
        )}
      </button>
    </div>
  );
}
