import workerpool from 'workerpool';
import { SOEProtocol } from "../../protocols/soeprotocol";
import "h1z1-buffer";

const protocol = new SOEProtocol();

// create a worker and register public functions
workerpool.worker({
    parse: protocol.parse
});