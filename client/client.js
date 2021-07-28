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
let callee = null;

async function init() {

  let response = await fetch('https://petr-acs-roulette-server.azurewebsites.net/start');
  let token = null;
  if (response.ok) { // if HTTP-status is 200-299
    // get the response body (the method explained below)
    let json = await response.json();
    token = json.user.token;
    userId = json.user.user.communicationUserId;
    callee = json.callee;
    console.log(json);
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

    const addedCall = await e.incomingCall.accept({ videoOptions: { localVideoStreams: [localVideoStream] } });
    call = addedCall;

    subscribeToRemoteParticipantInCall(addedCall);
  });

  callAgent.on('callsUpdated', e => {
    e.removed.forEach(removedCall => {
      // dispose of video renderers
      rendererLocal.dispose();
      rendererRemote.dispose();
      // toggle button states
      hangUpButton.disabled = true;
      callButton.disabled = false;
    })
  })
}
init();

async function localVideoView() {
  rendererLocal = new VideoStreamRenderer(localVideoStream);
  const view = await rendererLocal.createView();
  document.getElementById("myVideo").appendChild(view.target);
}

async function remoteVideoView(remoteVideoStream) {
  rendererRemote = new VideoStreamRenderer(remoteVideoStream);
  const view = await rendererRemote.createView();
  document.getElementById("remoteVideo").appendChild(view.target);
}

callButton.addEventListener("click", async () => {
  await callUser(callee);
});

nextButton.addEventListener("click", async () => {
  await hangUp();
  
  let response = await fetch('https://petr-acs-roulette-server.azurewebsites.net/next');
  
  if (response.ok) { // if HTTP-status is 200-299
    // get the response body (the method explained below)
    let json = await response.json();
    callee = json.callee;
    console.log(json);
  } else {
    console.log(response.status + ": " + response.statusText);
  }

  await callUser(callee);

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
    callButton.disabled = true;
  }
}

async function hangUp() {
  rendererLocal.dispose();
  rendererRemote.dispose();
  // end the current call
  await call.hangUp();
  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
}

