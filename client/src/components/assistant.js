import React from "react";
import ReactDOM from "react-dom";
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { assistantActions } from "../store/slices/assistant-slice";
import "../styles/assistant.css";
import { GiRobotAntennas } from "react-icons/gi";


export default function Affirmation() {
    const [affirmation, setAffirmation] = useState('')
    const [finalAffirmation, setFinalAffirmation] = useState(false)
    const [result, setResult] = useState(null);
    const socketRef = useRef();
    const mediaRecorderRef = useRef(null);
    const [botState, setBotState] = useState("Connecting...");
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleChange = (e) => {
        setAffirmation(e.target.value)
    }

    // const readOutAffirmation = () => {
    //     const synth = window.speechSynthesis;

    //     if (synth) {
    //         const utterance = new SpeechSynthesisUtterance(affirmation);
    //         synth.speak(utterance);
    //     }
    // };

    // // Function to log the new value of affirmation when it changes
    // const handleAffirmationChange = (newAffirmation) => {
    //     console.log('Affirmation changed:', newAffirmation);
    //     readOutAffirmation();
    // };

    // useEffect(() => {
    //     handleAffirmationChange(affirmation);
    // }, [affirmation]);

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
        console.log("create socket called")
        const socket = new WebSocket('ws://localhost:3002');
        socket.onopen = () => {
            console.log({ event: 'onopen' });
            setBotState("Ready!");
            //socket.send('Connection established');
        };

        socket.onmessage = (message) => {
            //const received = JSON.parse(message.data);
            const transcript = message.data //received.channel.alternatives[0].transcript;
            if (transcript) {
                console.log(transcript);
                setAffirmation(transcript);
                dispatch(
                    assistantActions.fetchResponse(transcript)   
                )
                setBotState("Complteted");
            }
        };

        socket.onclose = () => {
            console.log({ event: 'onclose' });
            setBotState("Click to Reload");
        };

        socket.onerror = (error) => {
            console.log({ event: 'onerror', error });
            setBotState("Click to Reload");
        };

        socketRef.current = socket;
        startRecording();
    }

    const startRecording = () => {
        // Add microphone access
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                return alert('Browser not supported');
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });

            mediaRecorder.addEventListener('dataavailable', async (event) => {
                if (event.data.size > 0 && socketRef.current.readyState === 1) {
                    console.log(event.data);
                    socketRef.current.send(event.data);
                    setBotState("Listening...");
                    console.log("sending data");
                }
            });

            mediaRecorder.start(1000);
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

    // const activateMicrophone = () => {

    //     console.log('Submit')

    //     //Add microphone access
    //     navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    //         if (!MediaRecorder.isTypeSupported('audio/webm'))
    //             return alert('Browser not supported')
    //         const mediaRecorder = new MediaRecorder(stream, {
    //             mimeType: 'audio/webm',
    //         })

    //         //create a websocket connection
    //         const socket = new WebSocket('ws://localhost:3002')
    //         socket.onopen = () => {
    //             console.log({ event: 'onopen' })
    //             mediaRecorder.addEventListener('dataavailable', async (event) => {
    //                 if (event.data.size > 0 && socket.readyState === 1) {
    //                     socket.send(event.data)
    //                 }
    //             })
    //             mediaRecorder.start(1000)
    //         }

    //         socket.onmessage = (message) => {
    //             const received = JSON.parse(message.data)
    //             const transcript = received.channel.alternatives[0].transcript
    //             if (transcript) {
    //                 console.log(transcript)
    //                 setAffirmation(transcript)
    //             }
    //         }

    //         socket.onclose = () => {
    //             console.log({ event: 'onclose' })
    //         }

    //         socket.onerror = (error) => {
    //             console.log({ event: 'onerror', error })
    //         }
    //         socketRef.current = socket
    //     })
    // }

    return ReactDOM.createPortal(
        <div className='assistant_wrap'>
            <div className='bot_box'>
                <button className={`bot_img ${botState === "Click to Reload" && "rotate"}`} 
                    disabled={botState !== "Click to Reload"} onClick={createSocket}
                >
                    <GiRobotAntennas size={40}/>
                </button>
                {/* <button onClick={startRecording}>Start Recording</button>
                <button onClick={stopRecording}>Stop Recording</button> */}
                <p>{botState}</p>
            </div>
        </div>
    , document.getElementById("assistant-hook") )
}