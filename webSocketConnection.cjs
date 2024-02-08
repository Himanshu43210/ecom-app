require('dotenv').config()

// Add Deepgram so we can get the transcription
const { Deepgram } = require('@deepgram/sdk')
const deepgram = new Deepgram(process.env.DG_KEY)
const OpenAIAPI = require('openai')

// Add WebSocket 
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3002 })
let decodedBuffer = ''; // Buffer to store decoded text
let silenceTimer = null; // Timer to track silence duration

// Open WebSocket Connection and initiate live transcription
wss.on('connection', (ws) => {
  console.log('Started...');
  const deepgramLive = deepgram.transcription.live({
    interim_results: true,
    punctuate: true,
    endpointing: true,
    vad_turnoff: 500,
  });

  deepgramLive.addListener("open", () => console.log("dg onopen"));

  deepgramLive.addListener("error", (error) => console.log({ error }));

  ws.onmessage = (event) => {
    deepgramLive.send(event.data);
  };

  ws.onclose = () => deepgramLive.finish();

  deepgramLive.addListener("transcriptReceived", (data) => {
    let decoded;
    try {
      const received = JSON.parse(data);

      if (
        received &&
        received.channel &&
        received.channel.alternatives &&
        received.channel.alternatives[0]
      ) {
        decoded = received.channel.alternatives[0].transcript;
        if (decoded) {
          decodedBuffer += decoded + ' '; // Append decoded text to the buffer
          console.log('Decoded:', decoded);

          // Reset the silence timer if new data is received
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }

          // Set a timer to process the buffer after 3 seconds of silence
          silenceTimer = setTimeout(() => {
            processBuffer();
          }, 2000);

        }
      } else {
        console.error("Unexpected response structure:", received);
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
    //console.log(decoded);
    //keywordGenerator(decoded);
    //ws.send(data);
  });

  const processBuffer = () => {
    // Check if the buffer is not empty
    if (decodedBuffer) {
      ws.send(decodedBuffer);
      console.log('Processing buffer:', decodedBuffer);
      // Call your processing function here (e.g., keyword extraction)
      decodedBuffer = ''; // Clear the buffer after processing
    }
  
    // Repeat the process by setting a new timeout
    silenceTimer = setTimeout(() => {
      processBuffer();
    }, 2000);
  };

});

const keywordGenerator = async (payload) => {
  if(!payload){
    return;
  }
  console.log("to -> Gpt");
  const openai = new OpenAIAPI({ key: process.env.OPENAI_API_KEY });
  try {
    const userQuery = payload;
    const prompt = `Find information about the product: ${userQuery}.
     Provide details such as the main product name and the company.
     if these things are not provided from the user, do not add them. 
     only tell the correct information and just the search keyword to search from the dataset
     just the answer nothing else. I Just need a single string of the search keyword`;

    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });
    //const extractedInfo = extractInfoFromResponse(response.choices[0]?.message?.content || "");
    if( response && response.choices && response.choices[0] && response.choices[0].message){
      console.log(response.choices[0].message);
      console.log(response.usage);
    }
    //when we get keyword we search in database and if find something we will return data here.
  } catch (error) {
    console.error('Error processing query:', error);
  }
}

//new prompt
// You are a voice assistant for my e - commerce company, named ecom. 
// I am going to send you raw voice data in text format from which you have to create a sentence out of data what user want to say.
// Now from that sentence you have to put it in three types( query, navigation, search)
// you have choose what user want out of this three
//  - query means user wants to know about something like company or contacts info etc then you have explain him in brief.
// - navigation means user want to navigate to  one of the pages of website
// - search means user want to search for product/item/catogary/brand on website
// now you have to send me response strictly as i say 
// if type is "query" then ,
// first word should be "query" and then after it the response you have generated.
// Example response - "query: we are the ecom.com we are ..."
// if type is "navigation" then,
// i want only two words first "navigation"  second should be name of route nothing else.
// Example resonese - "navigation: /home" 
// if type is "search" then
// i want first word to be "search" and next words should be brand name/product name/ product category  you get from data only one of them also size of response should not be greater then 3 words
// Exapmle response - "search: iphone 11"

// voice data - "Finfa a akhekgne me  find  find me  me find me and mixer grind me a mixer grinder"