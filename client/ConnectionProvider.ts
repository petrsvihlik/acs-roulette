let baseApiUrl: string | undefined = process.env.CONNECTION_BASE_API_URL;

if (baseApiUrl === undefined) {
  throw new Error("Base API URL must be defined!");
}
let userId: string;

export class ConnectionProvider {
  public async init() {
    let response = await fetch(baseApiUrl + "/init");
    if (response.ok) {
      // if HTTP-status is 200-299
      // get the response body (the method explained below)
      let json = await response.json();
      let token = json.token;
      userId = json.user.communicationUserId;
      console.log(json);
      console.log("userId: " + userId);
      return { token };
    } else {
      console.log(response.status + ": " + response.statusText);
    }
  }

  public async getNextCallee(): Promise<string | null | undefined> {
    // Get callee
    const requestHeaders: HeadersInit = new Headers();
    if (userId != null) {
      requestHeaders.set("userId", userId);
    }
    let response = await fetch(baseApiUrl + "/next", {
      headers: requestHeaders,
    });
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
}
