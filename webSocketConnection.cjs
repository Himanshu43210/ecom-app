require('dotenv').config()

// Add Deepgram so we can get the transcription
const { Deepgram } = require('@deepgram/sdk')
const deepgram = new Deepgram(process.env.DG_KEY)
const OpenAIAPI = require('openai')
const fs = require('fs');
const webmData = fs.readFileSync('./garbage.webm');
const PlayHT = require("playht");
const { init, stream } = require("playht");
const sdk = require('api')('@pplx/v0#cgfwhhzlrzivxql');

init({
  apiKey: process.env.PLHT_API_KEY,
  userId: process.env.PLHT_USER_API_KEY,
  defaultVoiceId: 's3://peregrine-voices/oliver_narrative2_parrot_saad/manifest.json',
  defaultVoiceEngine: 'PlayHT2.0',
});


sdk.auth(process.env.PPLX_API_KEY);

// Add WebSocket 
const WebSocket = require('ws')
const PORT = process.env.PORT || 3002;
const wss = new WebSocket.Server({ port: PORT })
let decodedBuffer = ''; // Buffer to store decoded text
let silenceTimer = null; // Timer to track silence duration
let wsIsOpen = true;
let garbage;
let firsttime;

// Open WebSocket Connection and initiate live transcription
wss.on('connection', (ws) => {
  console.log('Started...');
  const deepgramLive = deepgram.transcription.live({
    interim_results: true,
    punctuate: true,
    endpointing: true,
    vad_turnoff: 10000,
  });

  deepgramLive.addListener("open", () => console.log("dg onopen"));

  deepgramLive.addListener("error", (error) => {
    console.log({ error }) 
    ws.send("failed");
  });

  ws.onmessage = (event) => {
    if(event.data === "paused"){
      deepgramLive.send(webmData);
    }else{
      deepgramLive.send(event.data);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    wsIsOpen = false;
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
    wsIsOpen = false;
    deepgramLive.finish();
  };

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
          }, 2500);

        }
      } else {
        console.log("Unexpected response structure:", received);
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });

  const processBuffer = () => {
    // Check if the buffer is not empty
    if (decodedBuffer) {
      console.log('Processing buffer:', decodedBuffer);
      // keywordGenerator(decodedBuffer);
      keyGenPerplex(decodedBuffer);
      // Call your processing function here (e.g., keyword extraction)
      decodedBuffer = ''; // Clear the buffer after processing
    }
  
    // Repeat the process by setting a new timeout
    silenceTimer = setTimeout(() => {
      processBuffer();
    }, 2500);
  };

  const keywordGenerator = async (payload) => {
    console.log("to -> Gpt");
    const openai = new OpenAIAPI({ key: process.env.OPENAI_API_KEY });
    try {
      const userQuery = payload;
      const prompt = `You are a voice assistant for my e - commerce company, named ecom. 
      I am going to send you raw voice data in text format from which you have to create a sentence out of data what user want to say.
      Now from that sentence you have to put it in three types( query, navigation, search)
      you have choose what user want out of this three
       - query means user wants to know about something like company or contacts info etc then you have explain him in brief.
      - navigation means user want to navigate to  one of the pages of website
      - search means user want to search for product/item/catogary/brand on website
      now you have to send me response strictly as i say 
      if type is "query" then ,
      first word should be "query" and then after it the response you have generated.
      Example "query: we are the ecom.com we are ..."
      if type is "navigation" then,
      i want only two words first "navigation"  second should be path of page nothing else.
      This is the list of all navigations of my website, match with element and return path, path should be strictly out 
      of this do not send anything out of these paths and if you cant match send *. Example "navigation: *".
      if user is querying about some page navigate him to that page instead of query. example user is query about
      forgotten password instead of explaining just send him to forgot password page. Dont explain user to how to go 
      certain page instead navigate him to that page.
      Navigation path must be from this array strictly nothing out of this array will be tollerated.
      [     {  path="/" element=Home }
              {path="/categories" element=Categories }
              {path="/cart" element=CartPage }
              {path="/search" element=Search}
              {path="/dashboard/user" element=Dashboard}
              {path="/dashboard/user/orders" element=Orders}
              {path="/dashboard/user/profile" element=profile}
              {path="/register" element=register}
              {path="/forgot-password" element=forgot-password}
              {path="/login" element=login}      
              {path="/about" element=about}  
              {path="/contact" element=contact}  
              {path="/policy" element=policy}  
      ]
      Example if your ask for home screen page send "navigation: /" 
      if type is "search" then
      i want first word to be "search" and next words should be brand name/product name/ product category  you get from data only one of them also size of response should not be greater then 3 words
      Exapmle "search: iphone 11"
      
      voice data - ${payload}`;
  
      const response = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
      });
      //const extractedInfo = extractInfoFromResponse(response.choices[0]?.message?.content || "");
      if( response && response.choices && response.choices[0] && response.choices[0].message){
        const result = response.choices[0].message.content;
        console.log(result);
        const spaceIndex = result.indexOf(" ");
        const type = result.substring(0, spaceIndex);
        const mainCont = result.substring(spaceIndex + 1).trim();

        if(type === "query:"){

          // const stream = await PlayHT.stream(mainCont, {
          //   voiceEngine: 'PlayHT2.0-turbo',
          //   voiceId: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
          //   outputFormat: 'mp3',
          // });
          const generated = await PlayHT.generate(mainCont, {
            outputFormat: 'mp3',
          });
          const { audioUrl } = generated;
          ws.send(audioUrl);
          console.log(audioUrl);
        }else{
          ws.send(result);
        }
      }
      //when we get keyword we search in database and if find something we will return data here.
    } catch (error) {
      console.error('Error processing query:', error);
    }
  }

  const keyGenPerplex = (payload) => {
    sdk.post_chat_completions({
      model: 'llama-2-70b-chat',
      messages: [
        {role: 'system', content: `You are a voice assistant for my e - commerce company, named ecom. 
        user is going to send you raw voice data in text format, which contains repeated lines similar to each other
        from which you have to create a sentence out of data what user want to say.
        Now from that sentence you have to put it in three types( query, navigation, search)
        you have choose what user want out of this three
        - query means user wants to know about something like company or contacts info etc then you have explain him in brief.
        - navigation means user want to navigate to  one of the pages of website
        - search means user want to search for product/item/catogary/brand on website
        now you have to send me response strictly as i say 
        if type is "query" then ,
        first word should be "query" and then after it the response you have generated.
        Example "query: we are the ecom.com we are ..."
        if type is "navigation" then,
        i want only two words first "navigation"  second should be path of page nothing else.
        This is the list of all navigations of my website, match with element and return path, path should be strictly out 
        of this do not send anything out of these paths and if you cant match send *. Example "navigation: *".
        if user is querying about some page navigate him to that page instead of query. example user is query about
        forgotten password instead of explaining just send him to forgot password page. Dont explain user to how to go 
        certain page instead navigate him to that page.
        Navigation path must be from this array strictly nothing out of this array will be tollerated.
        [     {  path="/" element=Home }
                {path="/categories" element=Categories }
                {path="/categories/electronics-and-home-appliances" element=Electronics & Home Appliances }
                {path="/cart" element=CartPage }
                {path="/search" element=Search}
                {path="/dashboard/user" element=Dashboard}
                {path="/dashboard/user/orders" element=Orders}
                {path="/dashboard/user/profile" element=profile}
                {path="/register" element=register}
                {path="/forgot-password" element=forgot-password}
                {path="/login" element=login}      
                {path="/about" element=about}  
                {path="/contact" element=contact}  
                {path="/policy" element=policy}  
        ]
        Example if your ask for home screen page send "navigation: /" 
        
        [
        {path="/category/electronics-and-home-appliances" category=Electronics & Home Appliances}
        {path="/category/clothing-and-apparel" category=clothing-and-apparel}
        {path="/category/home-and-furniture" category=home-and-furniture}
        {path="/category/beauty-and-personal-care" category=beauty-and-personal-care}
        {path="/category/books-and-stationery" category=books-and-stationery}
        {path="/category/sports-and-outdoors" category=sports-and-outdoors}
        {path="/category/toys-and-games" category=toys-and-games} 
        {path="/category/health-and-wellness" category=health-and-wellness}
        {path="/category/jewelry-and-accessories" category=jewelry-and-accessories}
        {path="/category/automotive" category=automotive}
        {path="/category/musical-instruments" category=musical-instruments}
        {path="/category/gym-equipment's-and-accessories" category=gym-equipment's-and-accessories}
        {path="/category/home-decor" category=home-decor}
        {path="/category/tools-and-home-improvement-equipment's" category=tools-and-home-improvement-equipment's}
        ]
        if type is "search" then
        i want first word to be "search" and next words should be brand name/product name/ product category  you get from data only one of them also size of response should not be greater then 3 words
        if you have got brand name or product name then , return these Exapmle "search: iphone 11"
        and if you got category name then return a path from above categories Example "navigation: /category/tools-and-home-improvement-equipment's"
        if user is looking for some categories of products like electronics or sports or tools then return navigation path in navigation format instead of sending query. 
        only return search type if you are sure that you got brand name or item name else match them to category and return catory path also return exact path character by character do not make mistakes
        also do not mix categories each category is different do not merge them return only one path out of the given paths.

        sent any one respone of three types which best matches, do not sent anything else other than the responses i mentioned, if you can't find anything return "nothing"
        you are sending other information with data
        the response can only be one "search: iphone 11" or "navigation: /" or "query: we are the ecom.com we are ..." or "nothing" and must not include anything else.
        Do not send any response without declaring its type if you can't put it in any type, then put it in "query:" type and then send response. This should be top priority. 
        `},
        {role: 'user', content: payload}
      ]
    })
      .then( async ({ data }) => {
        if( data && data.choices && data.choices[0] && data.choices[0].message){
          const result = data.choices[0].message.content;
          console.log(result);
          const spaceIndex = result.indexOf(" ");
          const type = result.substring(0, spaceIndex);
          const mainCont = result.substring(spaceIndex + 1).trim();
  
          if(type === "query:"){
  
            // const stream = await PlayHT.stream(mainCont, {
            //   voiceEngine: 'PlayHT2.0-turbo',
            //   voiceId: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
            //   outputFormat: 'mp3',
            // });
            const generated = await PlayHT.generate(mainCont, {
              outputFormat: 'mp3',
            });
            const { audioUrl } = generated;
            ws.send(audioUrl);
            ws.send(result);
            console.log(audioUrl);
          }else{
            ws.send(result);
          }
        }
      })
      .catch(err => console.error(err));
  }

});



//new prompt
// You are a voice assistant for my e - commerce company, named ecom. 
// I am going to send you raw voice data in text format from which you have to create a sentence out of data what user want to say.
// Now from that sentence you have to put it in three types( query, navigation, search)
// you have choose what user want out of this three
// - query means user wants to know about something like company or contacts info etc then you have explain him in brief.
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