import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Pause, Download, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTextDetected: (text: string) => void;
  placeholder?: string;
  className?: string;
}

interface VoiceRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: VoiceRecognition, ev: Event) => any) | null;
  onend: ((this: VoiceRecognition, ev: Event) => any) | null;
  onresult: ((this: VoiceRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: VoiceRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => VoiceRecognition;
    webkitSpeechRecognition: new () => VoiceRecognition;
  }
}

export function VoiceInput({ onTextDetected, placeholder = "Speak to describe your problem...", className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Voice Recognition Started",
          description: "Speak clearly to describe your problem...",
          duration: 2000
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(Math.round(result[0].confidence * 100));
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);

        if (finalTranscript) {
          onTextDetected(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        toast({
          title: "Voice Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
          duration: 3000
        });
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTextDetected, toast]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setConfidence(0);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setConfidence(0);
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Voice input is not supported in this browser.</p>
            <p className="text-sm">Please use Chrome, Edge, or Safari for voice features.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Voice Input</span>
          </div>
          
          {confidence > 0 && (
            <Badge variant="secondary" className="text-xs">
              {confidence}% confidence
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-testid="button-voice-toggle"
            size="icon"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 text-sm text-muted-foreground">
            {isListening ? (
              <span className="text-primary font-medium">Listening...</span>
            ) : (
              placeholder
            )}
          </div>

          {transcript && (
            <Button
              data-testid="button-clear-transcript"
              size="sm"
              variant="outline"
              onClick={clearTranscript}
            >
              Clear
            </Button>
          )}
        </div>

        {transcript && (
          <div 
            data-testid="text-transcript"
            className="p-3 bg-muted rounded-md text-sm"
          >
            <p className="font-medium mb-1">Transcript:</p>
            <p className="text-muted-foreground">{transcript}</p>
          </div>
        )}

        {isListening && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Recording... Speak clearly and pause when finished.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface VoicePlayerProps {
  audioUrl?: string;
  title?: string;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

export function VoicePlayer({ audioUrl, title = "Audio Playback", onPlay, onPause, className }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title.replace(/\s+/g, '_')}.mp3`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{title}</span>
          </div>
          
          {audioUrl && (
            <Button
              data-testid="button-download-audio"
              size="sm"
              variant="outline"
              onClick={downloadAudio}
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            data-testid="button-audio-toggle"
            size="icon"
            variant="outline"
            onClick={togglePlayPause}
            disabled={!audioUrl}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1">
            {audioUrl ? (
              <div className="space-y-1">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No audio available
              </div>
            )}
          </div>
        </div>

        <audio
          ref={audioRef}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
}