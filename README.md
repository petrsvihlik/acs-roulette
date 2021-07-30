[![Live Demo](https://img.shields.io/badge/live-demo-brightgreen.svg)](https://petr-acs-roulette-server.azurewebsites.net/)

# ACS Roulette

Video-chat website that pairs random users in 1-on-1 sessions based on Azure Communication Services.


![Calling myself](https://user-images.githubusercontent.com/9810625/127651732-9441052f-7cbf-4b49-858c-5bfd375fec09.png)
*This is how I connected myself to my random self.*

## Live demo


### Prerequisites

- An Azure account with an active subscription. [Create an account for free](https://azure.microsoft.com/free/?WT.mc_id=A261C142F).
- [Node.js](https://nodejs.org/en/) Active LTS version
- An active Azure Communication Services resource. [Create a Communication Services resource](https://docs.microsoft.com/azure/communication-services/quickstarts/create-communication-resource).
- [ngrok](https://ngrok.com/) to be able to connect remote clients to localhost

### Server

- create a .env file with `COMMUNICATION_SERVICES_CONNECTION_STRING="<acsResourceConnectionString>"`
- `npm i`
- `npm run debug`
- `ngrok http 8080 -host-header="localhost:8080"`

### Client

- `cd client`
- create a .env file with `CONNECTION_BASE_API_URL="https://<acsRouletteServerBaseUrl>"`
- `npm i`
- `npm run start`
