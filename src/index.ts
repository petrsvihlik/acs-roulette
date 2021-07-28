import express from "express";
const app = express();
const port = 80; // default port to listen

let i : number = 0;

// define a route handler for the default home page
app.get( "/", ( req, res ) => {
    i++;
    res.send( "Hello world! " + i );
} );

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );