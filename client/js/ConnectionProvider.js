"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionProvider = void 0;
let baseApiUrl = process.env.CONNECTION_BASE_API_URL;
if (baseApiUrl === undefined) {
    throw new Error("Base API URL must be defined!");
}
let userId;
class ConnectionProvider {
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield fetch(baseApiUrl + "/init");
            if (response.ok) {
                let json = yield response.json();
                let token = json.token;
                userId = json.user.communicationUserId;
                console.log(json);
                console.log("userId: " + userId);
                return { token };
            }
            else {
                console.log(response.status + ": " + response.statusText);
            }
        });
    }
    getNextCallee() {
        return __awaiter(this, void 0, void 0, function* () {
            const requestHeaders = new Headers();
            if (userId != null) {
                requestHeaders.set("userId", userId);
            }
            let response = yield fetch(baseApiUrl + "/next", {
                headers: requestHeaders,
            });
            let callee = null;
            if (response.ok) {
                let json = yield response.json();
                console.log("getNextCallee:");
                console.log(json);
                callee = json.callee;
            }
            else {
                console.log(response.status + ": " + response.statusText);
            }
            return callee;
        });
    }
}
exports.ConnectionProvider = ConnectionProvider;
//# sourceMappingURL=ConnectionProvider.js.map