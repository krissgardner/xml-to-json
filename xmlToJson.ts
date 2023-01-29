// Considerations: xml-json package looks better, but requires too much process error handling and decided
// against it
import { readFileSync } from "fs";
import {xml2json} from "xml-js";

import {USAGE} from "./constants";

// Parse command line arguments
if (process.argv.length !== 3) {
    console.error("Invalid arguments");
    console.error(USAGE);
    process.exit(1);
}

const fileName = String(process.argv[2]);

// Read xml file
const readFile = (filename: string) => {
    try {
        return readFileSync(`./${filename}.xml`, 'utf8');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

// Convert XML into JSON
const xmlString = readFile(fileName);
const jsonString = xml2json(xmlString, {compact: true});
const jsonFile = JSON.parse(jsonString);

