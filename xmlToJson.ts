// Considerations: xml-json package looks better, but requires too much process error handling and decided
// against it
import { readFileSync } from "fs";
import { xml2json } from "xml-js";

import { USAGE } from "./constants";
import { InputFile, Element } from "./types";

// Parse command line arguments
if (process.argv.length !== 3) {
    console.error("Invalid arguments");
    console.error(USAGE);
    process.exit(1);
}

const docId = String(process.argv[2]);


// Read xml file
const readFile = (filepath: string) => {
    try {
        return readFileSync(filepath, 'utf8');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

// Find a realty field with the unique id passed as arg.
const getRealty = (jsonFile: InputFile, id: string) => {
    // Fixed feed position
    const feed = jsonFile.elements[0];
    if (feed?.type !== 'element')  {
        return;
    }

    // Fixed realties position
    const realties = feed.elements.find(e => e.type === 'element' && e.name === 'Realties');
    if (realties?.type !== 'element') {
        return;
    }

    // Find the realty with the specific id
    const realty = realties.elements.find(e => {
        if (e.type !== 'element' || e.name !== 'Realty') {
            return;
        }
        const idField = e.elements.find(e => e.type === 'element' && e.name === 'UniqueId');
        if (idField?.type !== 'element') {
            return;
        }
        const idValue = idField.elements[0];
        return idValue?.type === 'text' && idValue.text === id;
    })

    if (realty) {
        return realty;
    }
}

const formatter = (value: unknown) => {
    switch (value) {
        case '': {
            return '';
        }
        case 'true': {
            return true;
        }
        case 'false': {
            return false;
        }
    }
    try {
        const result = Number(value);
        return !isNaN(result) ? result : value;
    } catch (e) {
        return value;
    }
}

const parseRealty = (realty: Element) => {
    if (realty.type !== 'element') {
        return;
    }

    const output: {[key: string]: unknown} = {};

    realty.elements.forEach(element => {
        // Exclude all invalid fields
        if (element.type !== 'element') {
            return;
        }

        const key = element.name;
        // Skip, handler called later
        if (['Pictures'].includes(key)) {
            return;
        }

        // Default
        let value: unknown = "";

        if (element.elements?.length === 1) {
            const valueElement = element.elements[0];
            if (valueElement.type === 'text') {
                value = formatter(valueElement.text || '');
            }
        } else if (element.elements?.length > 1) {
            value = element.elements.map(valueElement => {
                if (valueElement.type !== 'text') {
                    return '';
                }
                return formatter(valueElement.text || '');
            });
        }

        output[key] = value;
    })

    // Handle Pictures field

    return output;
}


// DRIVER CODE

// Convert XML into JSON
const xmlString = readFile("./INPUT.xml");
const jsonString = xml2json(xmlString, {compact: false});
const jsonFile: InputFile = JSON.parse(jsonString);

const jsonRealty = getRealty(jsonFile, docId);
if (!jsonRealty) {
    console.warn(`ID ${docId} not found!`);
    process.exit(0);
}

const realty = parseRealty(jsonRealty);
