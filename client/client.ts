import {
  CallClient,
  CallAgent,
  VideoStreamRenderer,
  LocalVideoStream,
  IncomingCall,
  Call,
  DeviceManager,
  RemoteVideoStream,
  RemoteParticipant,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

let call: Call;
let callAgent: CallAgent;

let userId: string | null = null;
let iTerminated: boolean = false;

const callButton = document.getElementById("call-button") as HTMLButtonElement;
const hangUpButton = document.getElementById(
  "hang-up-button"
) as HTMLButtonElement;
const nextButton = document.getElementById("next-button") as HTMLButtonElement;
const waitingLabel = document.getElementById("waiting") as HTMLDivElement;

let deviceManager: DeviceManager;
let localVideoStream: LocalVideoStream;
let rendererLocal: VideoStreamRenderer;
let rendererRemote: VideoStreamRenderer;

function handleVideoStream(remoteVideoStream: RemoteVideoStream) {
  remoteVideoStream.on("isAvailableChanged", async () => {
    if (remoteVideoStream.isAvailable) {
      remoteVideoView(remoteVideoStream);
    } else {
      console.log("disposing handleVideoStream");
      rendererRemote.dispose();
    }
  });
  if (remoteVideoStream.isAvailable) {
    remoteVideoView(remoteVideoStream);
  }
}

function subscribeToParticipantVideoStreams(
  remoteParticipant: RemoteParticipant
) {
  remoteParticipant.on("videoStreamsUpdated", (e) => {
    e.added.forEach((v) => {
      handleVideoStream(v);
    });
  });
  remoteParticipant.videoStreams.forEach((v) => {
    handleVideoStream(v);
  });
}

function subscribeToRemoteParticipantInCall(callInstance: Call) {  
  waitingLabel.style.visibility = 'hidden';
  callInstance.on("remoteParticipantsUpdated", (e) => {
    e.added.forEach((p) => {
      subscribeToParticipantVideoStreams(p);
    });
  });
  callInstance.remoteParticipants.forEach((p) => {
    subscribeToParticipantVideoStreams(p);
  });
}

async function init() {
  let response = await fetch(
    "https://petr-acs-roulette-server.azurewebsites.net/init"
  );
  let token = null;
  if (response.ok) {
    // if HTTP-status is 200-299
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
  callAgent = await callClient.createCallAgent(tokenCredential, {
    displayName: "optional ACS user name",
  });

  deviceManager = await callClient.getDeviceManager();
  callButton.disabled = false;

  callAgent.on("incomingCall", async (e) => {
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    localVideoStream = new LocalVideoStream(videoDeviceInfo);
    localVideoView();

    callButton.disabled = true;
    hangUpButton.disabled = false;
    nextButton.disabled = false;

    const addedCall = await e.incomingCall.accept({
      videoOptions: { localVideoStreams: [localVideoStream] },
    });
    call = addedCall;

    subscribeToRemoteParticipantInCall(addedCall);
  });

  callAgent.on("callsUpdated", (e) => {
    console.log("callsUpdated");
    console.log(e);
    e.removed.forEach(async (removedCall) => {
      // dispose of video renderers
      console.log("disposing onCallsUpdated");
      rendererLocal.dispose();
      //rendererRemote.dispose();
      // toggle button states
      hangUpButton.disabled = true;
      nextButton.disabled = true;
      callButton.disabled = false;
      console.log("call has been terminated");
      if (iTerminated === false) {
        // call was terminated by the other side
        // Get callee
        let callee = await getNextCallee();

        await callUser(callee);

        hangUpButton.disabled = false;
        nextButton.disabled = false;
        callButton.disabled = true;
      }
    });
  });
}
init();

function removeAllChildNodes(parent: HTMLElement | null) {
  if (parent != null) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}

async function localVideoView() {
  rendererLocal = new VideoStreamRenderer(localVideoStream);
  const view = await rendererLocal.createView();
  const myVideoElement: HTMLElement = document.getElementById(
    "myVideo"
  ) as HTMLElement;
  removeAllChildNodes(myVideoElement);
  myVideoElement.appendChild(view.target);
}

async function remoteVideoView(remoteVideoStream: RemoteVideoStream) {
  rendererRemote = new VideoStreamRenderer(remoteVideoStream);
  const view = await rendererRemote.createView();
  const remoteVideoElement = document.getElementById(
    "remoteVideo"
  ) as HTMLElement;
  removeAllChildNodes(remoteVideoElement);
  remoteVideoElement.appendChild(view.target);
}

callButton.addEventListener("click", async () => {
  let callee = await getNextCallee();

  await callUser(callee);

  hangUpButton.disabled = false;
  nextButton.disabled = false;
  callButton.disabled = true;
});

nextButton.addEventListener("click", async () => {
  await hangUp();

  // Get callee
  let callee = await getNextCallee();

  await callUser(callee);
  
  hangUpButton.disabled = false;
  nextButton.disabled = false;
  callButton.disabled = true;
});

hangUpButton.addEventListener("click", async () => {
  // dispose of video renderers
  await hangUp();

  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
  nextButton.disabled = true;
});

async function getNextCallee(): Promise<string | null | undefined> {
  // Get callee
  const requestHeaders: HeadersInit = new Headers();
  if (userId != null) {
    requestHeaders.set("userId", userId);
  }
  let response = await fetch(
    "https://petr-acs-roulette-server.azurewebsites.net/next",
    { headers: requestHeaders }
  );
  let callee: string | null = null;
  if (response.ok) {
    let json = await response.json();
    console.log("getNextCallee:");
    console.log(json);
    callee = json.callee;
  } else {
    console.log(response.status + ": " + response.statusText);
  }
  return callee;
}

async function callUser(userToCall: string | null | undefined) {
  if (userToCall === null || userToCall === undefined) {
    console.log("waiting to be called");
    waitingLabel.style.visibility = 'visible';
  } else {
    const videoDevices = await deviceManager.getCameras();
    const videoDeviceInfo = videoDevices[0];
    localVideoStream = new LocalVideoStream(videoDeviceInfo);

    localVideoView();
    console.log("callee: " + userToCall);
    call = callAgent.startCall([{ communicationUserId: userToCall }], {
      videoOptions: { localVideoStreams: [localVideoStream] },
    });

    subscribeToRemoteParticipantInCall(call);
  }
}

async function hangUp() {
  iTerminated = true;

  // end the current call
  await call.hangUp();
}
