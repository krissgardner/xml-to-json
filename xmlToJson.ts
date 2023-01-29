// Considerations: xml-json package looks better, but requires too much process error handling and decided
// against it
import { readFileSync } from "fs";

import {USAGE} from "./constants";

// Parse command line arguments
if (process.argv.length !== 3) {
    console.error("Invalid arguments");
    console.error(USAGE);
    process.exit(1);
}

const fileName = String(process.argv[2]);

// Read xml file
const readFile = async (filename: string) => {
    try {
        return readFileSync(`./${filename}.xml`, 'utf8');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

const xmlString = readFile(fileName);


// const result = xml2json(xml, {compact: true, spaces: 4});