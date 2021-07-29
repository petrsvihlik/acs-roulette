import { VideoStreamRendererView } from "@azure/communication-calling";
import { CallStatus } from "./CallStatus";
import { VideoDirection } from "./VideoDirection";
import { CountDownTimer } from "./CountDownTimer";
import { CallManager } from "./CallManager";

const callButton = document.getElementById("call-button") as HTMLButtonElement;
const hangUpButton = document.getElementById(
  "hang-up-button"
) as HTMLButtonElement;
const nextButton = document.getElementById("next-button") as HTMLButtonElement;

let countdown: CountDownTimer = new CountDownTimer(
  nextButton,
  120,
  nextButton.innerHTML
);

let callManager: CallManager = new CallManager(setUI, handleVideoView);

async function handleVideoView(
  view: VideoStreamRendererView,
  type: VideoDirection
) {
  let element: HTMLElement | null;

  switch (type) {
    case VideoDirection.Local:
      const myVideoElement: HTMLElement = document.getElementById(
        "myVideo"
      ) as HTMLElement;
      element = myVideoElement;
      break;
    case VideoDirection.Remote:
      const remoteVideoElement = document.getElementById(
        "remoteVideo"
      ) as HTMLElement;
      element = remoteVideoElement;
      break;
    default:
      element = null;
      break;
  }

  function removeAllChildNodes(parent: HTMLElement | null) {
    if (parent != null) {
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
    }
  }

  if (element != null) {
    removeAllChildNodes(element);
    element.appendChild(view.target);
  }
}

window.addEventListener("beforeunload", async function (e) {
  delete e["returnValue"];
  await callManager.hangUpCall();
});

callButton.addEventListener("click", async () => {
  await callManager.call();
});

nextButton.addEventListener("click", async () => {
  await callManager.next();
});

hangUpButton.addEventListener("click", async () => {
  await callManager.hangUpCall();
});

function setUI(status: CallStatus) {
  const waitingLabel = document.getElementById("waiting") as HTMLDivElement;

  switch (status) {
    case CallStatus.Disconnected:
      hangUpButton.disabled = true;
      callButton.disabled = false;
      nextButton.disabled = true;
      waitingLabel.style.visibility = "hidden";
      countdown.resetCountdown();
      break;

    case CallStatus.Connected:
      hangUpButton.disabled = false;
      callButton.disabled = true;
      nextButton.disabled = false;
      waitingLabel.style.visibility = "hidden";
      countdown.startCountdown();
      break;

    case CallStatus.Waiting:
      hangUpButton.disabled = false;
      callButton.disabled = true;
      nextButton.disabled = true;
      waitingLabel.style.visibility = "visible";
      countdown.resetCountdown();
      break;
  }
}

callManager.init();
