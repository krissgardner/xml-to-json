// TYPES
export type Text = {
    type: 'text';
    text: string;
}

export type Element = {
    type: 'element';
    name: string;
    elements: Element[];
} | Text;

export type InputFile = {
    declarations: {
        attributes: {
            [key: string]: string;
        }
    }
    elements: Element[];
}