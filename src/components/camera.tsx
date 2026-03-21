import { useEffect, useRef, useState } from "react";

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isStarting, setIsStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const stopCamera = () => {
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (!recorder) {
      stopCamera();
      setIsRecording(false);
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopCamera();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (isStarting || isRecording) {
      return;
    }

    setIsStarting(true);
    setError(null);

    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        if (recordedBlob.size > 0) {
          const url = URL.createObjectURL(recordedBlob);
          setRecordingUrl(url);
        }

        setIsRecording(false);
        stopCamera();
      };

      streamRef.current = stream;
      recorderRef.current = recorder;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao abrir camera e iniciar gravacao:", err);
      setError("Nao foi possivel acessar a camera ou iniciar a gravacao.");
      stopCamera();
    } finally {
      setIsStarting(false);
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  };

  useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        stopCamera();
      }
    };
  }, [recordingUrl]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <button
        className="w-fit rounded px-4 py-2 font-bold text-white disabled:opacity-50 bg-blue-600"
        disabled={isStarting}
        onClick={handleRecordingToggle}
        type="button"
      >
        {isStarting
          ? "ABRINDO..."
          : isRecording
            ? "PARAR DE GRAVAR"
            : "COMEÇAR A GRAVAR"}
      </button>

      <video
        ref={videoRef}
        autoPlay
        className="max-w-xl rounded bg-black"
        controls={false}
        muted
        playsInline
      />

      {isRecording ? <p>Gravando...</p> : null}
      {error ? <p className="text-red-500">{error}</p> : null}

      {recordingUrl ? (
        <a
          className="font-bold text-blue-500"
          download="gravacao.webm"
          href={recordingUrl}
        >
          Baixar gravacao
        </a>
      ) : null}
    </div>
  );
};

export { Camera };
