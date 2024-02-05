require('dotenv').config()

// Add Deepgram so we can get the transcription
const { Deepgram } = require('@deepgram/sdk')
const deepgram = new Deepgram(process.env.DG_KEY)
const OpenAIAPI = require('openai')

// Add WebSocket 
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3002 })

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
        
      } else {
        console.error("Unexpected response structure:", received);
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
    console.log(decoded);
    keywordGenerator(decoded);
    ws.send(data);
  });
});

const keywordGenerator = async (payload) => {
  if(!payload){
    return;
  }
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
    const extractedInfo = extractInfoFromResponse(response.choices[0]?.message?.content || "");
    console.log(extractedInfo);
    //when we get keyword we search in database and if find something we will return data here.
  } catch (error) {
    console.error('Error processing query:', error);
  }
}