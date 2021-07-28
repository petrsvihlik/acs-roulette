import { CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

let call;
let callAgent;
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const nextButton = document.getElementById("next-button");

let deviceManager;
let localVideoStream;
let rendererLocal;
let rendererRemote;

function handleVideoStream(remoteVideoStream) {
  remoteVideoStream.on('isAvailableChanged', async () => {
    if (remoteVideoStream.isAvailable) {
      remoteVideoView(remoteVideoStream);
    } else {
      rendererRemote.dispose();
    }
  });
  if (remoteVideoStream.isAvailable) {
    remoteVideoView(remoteVideoStream);
  }
}

function subscribeToParticipantVideoStreams(remoteParticipant) {
  remoteParticipant.on('videoStreamsUpdated', e => {
    e.added.forEach(v => {
      handleVideoStream(v);
    })
  });
  remoteParticipant.videoStreams.forEach(v => {
    handleVideoStream(v);
  });
}

function subscribeToRemoteParticipantInCall(callInstance) {
  callInstance.on('remoteParticipantsUpdated', e => {
    e.added.forEach(p => {
      subscribeToParticipantVideoStreams(p);
    })
  });
  callInstance.remoteParticipants.forEach(p => {
    subscribeToParticipantVideoStreams(p);
  })
}

let userId = null;

async function init() {

  let response = await fetch('https://petr-acs-roulette-server.azurewebsites.net/init');
  let token = null;
  if (response.ok) { // if HTTP-status is 200-299
    // get the response body (the method explained below)
    let json = await response.json();
    token = json.token;
    userId = json.user.communicationUserId;
    console.log(json);
    console.log("userId: " + userId);
  } else {
    console.log(response.status + ": " + response.statusText);
  }

  const callClient = new CallClient();
  const tokenCredential = new AzureCommunicationTokenCredential(token);
  callAgent = await callClient.createCallAgent(tokenCredential, { displayName: 'optional ACS user name' });

  deviceManager = await callClient.getDeviceManager();
  callButton.disabled = false;

  callAgent.on('incomingCall', async e => {
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    localVideoStream = new LocalVideoStream(videoDeviceInfo);
    localVideoView();

    callButton.disabled = true;
    hangUpButton.disabled = false;
    nextButton.disabled = false;

    const addedCall = await e.incomingCall.accept({ videoOptions: { localVideoStreams: [localVideoStream] } });
    call = addedCall;

    subscribeToRemoteParticipantInCall(addedCall);
  });

  callAgent.on('callsUpdated', e => {
    console.log("callsUpdated");
    console.log(e);
    e.removed.forEach(removedCall => {
      // dispose of video renderers      
      rendererLocal.dispose();
      rendererRemote.dispose();
      // toggle button states
      hangUpButton.disabled = true;
      nextButton.disabled = true;
      callButton.disabled = false;
      console.log("call has been terminated");
    })
  })
}
init();

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}

async function localVideoView() {
  rendererLocal = new VideoStreamRenderer(localVideoStream);
  const view = await rendererLocal.createView();
  const myVideoElement = document.getElementById("myVideo");
  removeAllChildNodes(myVideoElement);
  myVideoElement.appendChild(view.target);
}

async function remoteVideoView(remoteVideoStream) {
  rendererRemote = new VideoStreamRenderer(remoteVideoStream);
  const view = await rendererRemote.createView();
  const remoteVideoElement = document.getElementById("remoteVideo");
  removeAllChildNodes(remoteVideoElement);
  remoteVideoElement.appendChild(view.target);
}

callButton.addEventListener("click", async () => {
  
  // Get callee
  let response = await fetch('https://petr-acs-roulette-server.azurewebsites.net/next', { headers: { 'userId': userId } });
  let callee = null;
  if (response.ok) { 
    let json = await response.json();
    console.log(json);
    callee = json.callee;
  } else {
    console.log(response.status + ": " + response.statusText);
  }

  await callUser(callee);
});

nextButton.addEventListener("click", async () => {
  await hangUp();

  // Get callee
  let response = await fetch('https://petr-acs-roulette-server.azurewebsites.net/next', { headers: { 'userId': userId } });
  let callee = null;
  if (response.ok) { 
    let json = await response.json();
    console.log(json);
    callee = json.callee;
  } else {
    console.log(response.status + ": " + response.statusText);
  }

  if (callee != null && callee != undefined) {
    await callUser(callee);
  }
  else {
    console.log("waiting to be connected");
  }

});

hangUpButton.addEventListener("click", async () => {
  // dispose of video renderers
  await hangUp();
});


async function callUser(userToCall) {
  const videoDevices = await deviceManager.getCameras();
  const videoDeviceInfo = videoDevices[0];
  localVideoStream = new LocalVideoStream(videoDeviceInfo);

  localVideoView();
  if (userToCall === null || userToCall === undefined) {
    console.log("waiting to be called");
  }

  else {
    console.log("callee: " + userToCall);
    call = callAgent.startCall(
      [{ communicationUserId: userToCall }],
      { videoOptions: { localVideoStreams: [localVideoStream] } }
    );

    subscribeToRemoteParticipantInCall(call);

    hangUpButton.disabled = false;
    nextButton.disabled = false;
    callButton.disabled = true;
  }
}

async function hangUp() {
  // end the current call
  await call.hangUp();
  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
}

