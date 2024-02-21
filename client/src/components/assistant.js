import React from "react";
import ReactDOM from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { assistantActions } from "../store/slices/assistant-slice";
import "../styles/assistant.css";
import { GiRobotAntennas } from "react-icons/gi";

export default function Affirmation() {

  const [result, setResult] = useState(null);
  const socketRef = useRef();
  const mediaRecorderRef = useRef(null);
  const speakerOnRef = useRef(false);
  const audioRef = useRef(null);
  const [audioLink, setAudioLink] = useState("");
  const [botState, setBotState] = useState("Connecting...");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const responeData = useSelector((state) => state.assistant.assistResponses);

  console.log(responeData);

//   const readOutAffirmation = (mainCont) => {
//     speakerOnRef.current = true;
//     console.log(speakerOnRef.current);
//     const synth = window.speechSynthesis;
//     if (synth) {
//       const utterance = new SpeechSynthesisUtterance(mainCont);
//       utterance.onend = () => {
//           // Set speakerOnRef to false after speaking is completed
//           speakerOnRef.current = false;
//           console.log(speakerOnRef.current);
//         };
//       synth.speak(utterance);
//     }
//   };

  useEffect(() => {
    if(audioLink){
        speakerOnRef.current = true;
        audioRef.current.play();
    }
  }, [audioLink])

  const handleEnded = () => {
    speakerOnRef.current = false;
  };

  useEffect(() => {
    console.log("assistant loaded");
    // Create WebSocket connection when component mounts
    createSocket();
    return () => {
      // Close WebSocket connection when component unmounts
      if (socketRef.current) {
        socketRef.current.close();
        console.log("assistant closed");
      }
    };
  }, []);

  const createSocket = () => {
    console.log("create socket called");
    const socket = new WebSocket("wss://voice-bot-j2u7.onrender.com");// "ws://localhost:3002" | "wss://voice-bot-j2u7.onrender.com"
    socket.onopen = () => {
      console.log({ event: "onopen" });
      setBotState("Ready!");
      //socket.send('Connection established');
    };

    socket.onmessage = (message) => {
      //const received = JSON.parse(message.data);
      const transcript = message.data; //received.channel.alternatives[0].transcript;
      if (transcript) {
        const spaceIndex = transcript.indexOf(" ");
        const type = transcript.substring(0, spaceIndex);
        const mainCont = transcript.substring(spaceIndex + 1).trim();
        const linkCheck = transcript.slice(0, 5);

        if(transcript === "failed"){
            //createSocket();
            socketRef.current.close();
            handleEnded();
            setBotState("Click to Reload");
            return;
        }
        
        if (type === "navigation:") {
          dispatch(assistantActions.fetchResponse("Navigating to - " + mainCont));
          navigate(mainCont);
        } else if (type === "categories:") {
          dispatch(assistantActions.fetchResponse("Navigating to - " + mainCont));
          navigate(mainCont);
        } else if (type === "search:") {
          dispatch(assistantActions.fetchResponse("Searching for : " + mainCont));
          const encodedSearchTerm = mainCont.replace(/ /g, "_");
          navigate(`/search?title=${encodedSearchTerm}`);
        } else if (type === "query:") {
          dispatch(assistantActions.fetchResponse(mainCont));
        } else if (linkCheck === "https") {
          setAudioLink(transcript);
        }else {
          console.log(linkCheck);
        }
        console.log(transcript);
        setBotState("Complteted");
      }
    };

    socket.onclose = () => {
      console.log({ event: "onclose" });
      setBotState("Click to Reload");
    };

    socket.onerror = (error) => {
      console.log({ event: "onerror", error });
      setBotState("Click to Reload");
    };

    socketRef.current = socket;
    startRecording();
  };

  const startRecording = () => {
    // Add microphone access
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        return alert("Browser not supported");
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0 && socketRef.current.readyState === 1 && !speakerOnRef.current) {
          console.log(event.data);
          socketRef.current.send(event.data);
          setBotState("Listening...");
          console.log("sending data");
        }else if(socketRef.current.readyState === 1){
            socketRef.current.send("pause");
            setBotState("Speaking...");
        }
      });

      mediaRecorder.start(2000);
      mediaRecorderRef.current = mediaRecorder;
      // let chunks; // Store recorded audio chunks

      // mediaRecorder.addEventListener('dataavailable', async (event) => {
      //     chunks = event.data;
      //     socketRef.current.send(event.data);
      //     setBotState("Processing...");
      //     console.log(chunks);
      // });

      // mediaRecorder.start();
      // setBotState("Listening...");

      // let isSpeaking = true; // Flag to track if the user is speaking

      // // Set a timeout to stop recording after 5 seconds
      // setTimeout(() => {
      //     mediaRecorder.stop();
      //     isSpeaking = false; // User has stopped speaking
      //     setBotState("Sending data...");
      //     if(socketRef.current.readyState === 1){
      //         console.log(chunks);
      //     }else{
      //         console.log("failed");
      //     }
      // }, 10000); // Stop recording after 5 seconds

      // mediaRecorderRef.current = mediaRecorder;
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return ReactDOM.createPortal(
    <div className="assistant_wrap">
      <div className="bot_box">
        <button
          className={`bot_img ${botState === "Click to Reload" && "rotate"}`}
          disabled={botState !== "Click to Reload"}
          onClick={createSocket}
        >
          <GiRobotAntennas size={40} />
        </button>
        {/* <button onClick={startRecording}>Start Recording</button>
                <button onClick={stopRecording}>Stop Recording</button> */}
        <p>{botState}</p>
      </div>
      <audio id="audioPlayer" ref={audioRef} src={audioLink} controls onEnded={handleEnded}>
            Your browser does not support the audio element.
      </audio>
    </div>,
    document.getElementById("assistant-hook")
  );
}
