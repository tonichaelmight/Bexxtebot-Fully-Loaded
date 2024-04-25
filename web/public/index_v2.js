// a static element
// once it renders its attributes should not change
// it should be fully attributed at initialization
class Variable extends HTMLElement {
    constructor() {
        super();
    }

    getRequiredAttribute(name) {
        const value = this.getAttribute(name);
        if (!value) throw new Error(`missing required ${name} attribute`)
        return value 
    }

    connectedCallback() {
        const article = document.createElement('article');
		const heading = document.createElement('h3');

        const variableName = this.getRequiredAttribute('name');
		heading.innerText = variableName;

        const variableType = this.getRequiredAttribute('type');

        let value = this.getRequiredAttribute('value');

		article.appendChild(heading);

		const hr = document.createElement('hr');
		article.appendChild(hr);

		const section = document.createElement('section');
        let listEl, listElChildren;

        switch(variableType) {
            case 'literal':
                const p = document.createElement('p');
                p.innerText = JSON.parse(value);
                section.appendChild(p);
                break;

            case 'array':
                listEl = document.createElement('ul');
                JSON.parse(value).forEach(el => {
                    const valueItem = document.createElement('li');
                    valueItem.innerText = `${el},`;
                    listEl.appendChild(valueItem);
                });
                listElChildren = listEl.children;
                // remove the comma from the last one
                listElChildren[listElChildren.length - 1].innerText = listElChildren[listElChildren.length - 1].innerText.slice(0, -1);
                section.appendChild(listEl);
                break;

            case 'object':
                listEl = document.createElement('ul');
                const parsedValue = JSON.parse(value);
                for (const key in parsedValue) {
                    const valueItem = document.createElement('li');
                    valueItem.innerHTML = `<strong>${key}</strong>: ${parsedValue[key]},`;
                    listEl.appendChild(valueItem);
                }
                listElChildren = listEl.children;
                listElChildren[listElChildren.length - 1].innerHTML = listElChildren[listElChildren.length - 1].innerHTML.slice(0, -1);
                section.appendChild(listEl);
                break;

            default:
                throw new Error(`Invalid variable type ${variableType}. Expected literal, array, or object`)
        }

        article.appendChild(section);

        this.appendChild(article);
    }
}

class EditVariable extends HTMLElement {
	static observedAttributes = ["type", "name", "value"];
    static validTypes = ['literal', 'array', 'object'];

	constructor() {
		super();
	}

    processType() {
        let variableType = this.getAttribute('type');
        if (!variableType) {
            variableType = 'literal';
            this.getAttribute('type', 'literal')
        }
        if (!EditVariable.validTypes.includes(variableType)) throw new Error(`invalid type ${variableType} given.`)
        return variableType;
    }

    processName() {
        let variableName = this.getAttribute('name');
        if (variableName === null) {
            variableName = '';
            this.getAttribute('name', '')
        }
        return variableName;
    }

    processValue() {
        let value = this.getAttribute('value');
        if (value === null) {
            value = '';
            this.getAttribute('name', '')
        }
        return value;
    }

    connectedCallback() {
        const variableType = this.processType();
        const variableName = this.processName();
        const variableValue = this.processValue();
    }
}

customElements.define('variable-element', Variable);
customElements.define('edit-variable-element', EditVariable);