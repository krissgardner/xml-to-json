// Considerations: xml-json package looks better, but requires too much process error handling and decided
// against it
import * as fs from "fs";
import { xml2json } from "xml-js";
import * as http from "http";
import * as https from "https";
import { Transform } from 'stream';

import {INPUT_FILE, OUTPUT_FILE, USAGE} from "./constants";
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
        return fs.readFileSync(filepath, 'utf8');
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

const downloadImage = (url: string, filename: string) => {
    let client: typeof http | typeof https = http;
    if (url.toString().indexOf("https") === 0){
        client = https;
    }

    client.request(url, function(response) {
        const data = new Transform();
        response.on('data', function(chunk) {
            data.push(chunk);
        });
        response.on('end', function() {
            fs.writeFileSync(filename, data.read());
        });
    }).end();
};

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
    const pictures = realty.elements.find((e) => {
        return e.type === 'element' && e.name === 'Pictures'
    });
    if (pictures && pictures.type === 'element') {
        const images = pictures.elements.filter(e => e.type === 'element' && e.name === 'Image');
        output['Pictures'] = images.map(img => {
            const result = {
                image: '',
                url: '',
            }

            if (img.type !== 'element') {
                return result;
            }
            const imgText = img.elements[0];
            if (imgText?.type !== 'text') {
                return result;
            }

            const url = imgText.text;
            result.url = url;

            const tokens = url.split('.');
            let extension = tokens[tokens.length - 1];
            if (!['jpg', 'jpeg', 'png'].includes(extension)) {
                extension = 'jpeg';
            }

            const imgId = `img_${new Date().toISOString()}`;
            const imgPath = `${__dirname}/images/${imgId}.${extension}`;

            downloadImage(url, imgPath);
            result.image = imgPath;

            return result;
        })
    }

    return output;
}


// DRIVER CODE

// Convert XML into JSON
const xmlString = readFile(INPUT_FILE);
const jsonString = xml2json(xmlString, {compact: false});
const jsonFile: InputFile = JSON.parse(jsonString);

const jsonRealty = getRealty(jsonFile, docId);
if (!jsonRealty) {
    console.warn(`ID ${docId} not found!`);
    process.exit(0);
}

const realty = parseRealty(jsonRealty);

const output = JSON.stringify(realty, null, 2);
fs.writeFileSync(OUTPUT_FILE, output);
