import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';


export default function Affirmation() {
    const [affirmation, setAffirmation] = useState('')
    const [finalAffirmation, setFinalAffirmation] = useState(false)
    const [result, setResult] = useState(null);
    const socketRef = useRef(null)
    const navigate = useNavigate();

    const handleChange = (e) => {
        setAffirmation(e.target.value)
    }

    const readOutAffirmation = () => {
        const synth = window.speechSynthesis;

        if (synth) {
            const utterance = new SpeechSynthesisUtterance(affirmation);
            synth.speak(utterance);
        }
    };

    // Function to log the new value of affirmation when it changes
    const handleAffirmationChange = (newAffirmation) => {
        console.log('Affirmation changed:', newAffirmation);
        readOutAffirmation();
    };

    // useEffect(() => {
    //     handleAffirmationChange(affirmation);
    // }, [affirmation]);

    // const handleSubmit = async (e) => {
    //     e.preventDefault();

    //     // Make the API call
    //     const response = await fetch('https://ecom-app-cyaw.onrender.com/askFromAssitant', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //             session_id: '4321',
    //             user_question: affirmation,
    //         }),
    //     });

    //     // Parse the response
    //     const data = await response.json();
    //     console.log(data)
    //     navigate(`/search?title=${data.title}`)
    //     // Update the result state
    //     setResult(data);

    //     // Set finalAffirmation to true
    //     setFinalAffirmation(true);
    // };

    useEffect( () => {
        console.log('Submit')
        //Add microphone access
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            if (!MediaRecorder.isTypeSupported('audio/webm'))
                return alert('Browser not supported')
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            })

            //create a websocket connection
            const socket = new WebSocket('ws://localhost:3002')
            socket.onopen = () => {
                console.log({ event: 'onopen' })
                setAffirmation("What do you want to search");
                mediaRecorder.addEventListener('dataavailable', async (event) => {
                    if (event.data.size > 0 && socket.readyState === 1) {
                        socket.send(event.data)
                    }
                })
                mediaRecorder.start(1000)
            }

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data)
                const transcript = received.channel.alternatives[0].transcript
                if (transcript) {
                    console.log(transcript)
                    setAffirmation(transcript)
                }
            }

            socket.onclose = () => {
                console.log({ event: 'onclose' })
            }

            socket.onerror = (error) => {
                console.log({ event: 'onerror', error })
            }
            socketRef.current = socket
        })
    }, []);

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

    return (
        <div className='App'>
            {/* <div className="card ">
                <div className='container'>
                    <div className='journal-body'>
                        {!finalAffirmation ? (
                            <>
                                <div className='description'>
                                    What affirmation do you want to give to yourself today?
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <textarea
                                        className='journal-input'
                                        value={affirmation}
                                        onChange={handleChange}
                                    />
                                    <br />
                                    <button
                                        type='submit'
                                        className='submit-button'
                                        disabled={affirmation.length === 0}>
                                        Submit
                                    </button>

                                    <button
                                        onClick={activateMicrophone}
                                        type='button'
                                        className='submit-button'>
                                        Voice 💬
                                    </button>

                                </form>
                            </>
                        ) : (
                            <>
                                Loading....
                                {result && (
                                    <div>
                                        <p>{result.title}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div> */}
        </div>
    )
}