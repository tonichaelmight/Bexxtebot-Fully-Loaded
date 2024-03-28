// thoughts
// I don't think the shadow dom is really necessary here?
// it frankly makes styling really weird?
// I'm not even sure the HTML template is necessary
// I think custom elements with just JS may suffice

class Variable extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		// let template = document.getElementById("variable-template");
		// let templateContent = template.content;

		// const shadowRoot = this.attachShadow({ mode: "open" });
		// shadowRoot.appendChild(templateContent.cloneNode(true));

		const article = document.createElement('article');
		const heading = document.createElement('h3');

		if (this.hasAttribute('name')) {
			heading.innerText = this.getAttribute('name');
		} else throw new Error('missing required attribute');

		article.appendChild(heading);

		const hr = document.createElement('hr');
		article.appendChild(hr);

		const section = document.createElement('section');
		const variableType = this.getAttribute('type');
		const value = this.getAttribute('value');
		//
		//
		// eval below
		//
		//
		if (item.type === 'array') {
			const listEl = document.createElement('ul');
			listEl.style.listStyle = 'none';
			listEl.style.padding = 0;
			const varValue = item.value.value;
			varValue.forEach(val => {
				const valueItem = document.createElement('li');
				valueItem.innerText = `${val},`;
				valueItem.style.margin = '5px 0';
				listEl.appendChild(valueItem);
			});
			const listElChildren = listEl.children;
			// remove the comma from the last one
			listElChildren[listElChildren.length - 1].innerText = listElChildren[listElChildren.length - 1].innerText.slice(0, -1);
			section.appendChild(listEl);

		} else if (item.type === 'object') {
			const listEl = document.createElement('ul');
			listEl.style.listStyle = 'none';
			listEl.style.padding = 0;
			const varValue = item.value.value;
			for (const key in varValue) {
				const valueItem = document.createElement('li');
				valueItem.innerHTML = `<strong>${key}</strong>: ${varValue[key]},`;
				valueItem.style.margin = '5px 0';
				listEl.appendChild(valueItem);
			} listElChildren = listEl.children;
			listElChildren[listElChildren.length - 1].innerHTML = listElChildren[listElChildren.length - 1].innerHTML.slice(0, -1);
			section.appendChild(listEl);

		} else {
			const p = document.createElement('p');
			p.innerText = item.value.value;
			section.appendChild(p);
		}
	}
}

class EditVariable extends HTMLElement {
	static observedAttributes = ["type"];

	constructor() {
		super();
	}

	connectedCallback() {
		let template = document.getElementById('edit-variable-template');
		let templateContent = template.content;

		const variableTypeSpan = this.querySelector('span[slot="variable-type"]');
		const variableType = variableTypeSpan.innerText;
		this.removeChild(variableTypeSpan);

		const variableDataSpan = this.querySelector('span[slot="value-data"]');
		const variableData = variableDataSpan.innerText;

		let startingValue;

		switch(variableType) {
			case 'literal':
			case 'array':
				startingValue = document.createElement('input');
				break;
			case 'object':
				startingValue = document.createElement('div');
				const k = document.createElement('input');
				k.setAttribute('class', 'key');
				const v = document.createElement('input');
				v.setAttribute('class', 'val');
				startingValue.appendChild(k);
				startingValue.innerHTML += ': ';
				startingValue.appendChild(v);
				break;
			default:
				break;
		}


		const variableValueInputs = document.createElement('section');
		variableValueInputs.appendChild(startingValue);

		const shadowRoot = this.attachShadow({ mode: "open" });
		shadowRoot.appendChild(templateContent.cloneNode(true));

		const hr = this.querySelector('hr');
		// console.log(shadowRoot.getElementByClassName('value-area'));
		// hr.insertAdjacentElement('afterend', variableValueInputs);

	}
}

customElements.define('variable-element', Variable);
customElements.define('edit-variable-element', EditVariable);

async function setUpPage() {
	const container = document.getElementById('variables-container');
	const config = await requestConfig();

	for (const item of config) {
		const varEl = document.createElement('variable-element');

		const varNameSpan = document.createElement('span');
		varNameSpan.setAttribute('slot', 'variable-name');
		varNameSpan.innerText = item.variable_name;
		varEl.appendChild(varNameSpan);

		const varValueElement = document.createElement('span');
		varValueElement.setAttribute('slot', 'value');
		varValueElement.style.textAlign = 'left';

		if (item.type === 'array') {
			const listEl = document.createElement('ul');
			listEl.style.listStyle = 'none';
			listEl.style.padding = 0;
			const varValue = item.value.value;
			varValue.forEach(val => {
				const valueItem = document.createElement('li');
				valueItem.innerText = `${val},`;
				valueItem.style.margin = '5px 0';
				listEl.appendChild(valueItem);
			});
			const listElChildren = listEl.children;
			// remove the comma from the last one
			listElChildren[listElChildren.length - 1].innerText = listElChildren[listElChildren.length - 1].innerText.slice(0, -1);
			varValueElement.appendChild(listEl);

		} else if (item.type === 'object') {
			const listEl = document.createElement('ul');
			listEl.style.listStyle = 'none';
			listEl.style.padding = 0;
			const varValue = item.value.value;
			for (const key in varValue) {
				const valueItem = document.createElement('li');
				valueItem.innerHTML = `<strong>${key}</strong>: ${varValue[key]},`;
				valueItem.style.margin = '5px 0';
				listEl.appendChild(valueItem);
			} listElChildren = listEl.children;
			listElChildren[listElChildren.length - 1].innerHTML = listElChildren[listElChildren.length - 1].innerHTML.slice(0, -1);
			varValueElement.appendChild(listEl);

		} else {
			const p = document.createElement('p');
			p.innerText = item.value.value;
			varValueElement.appendChild(p);
		}

		varEl.appendChild(varValueElement);

		container.appendChild(varEl);
	}

	const newVar = document.createElement('edit-variable-element');

	const varNameInput = document.createElement('span');
	varNameInput.setAttribute('slot', 'variable-name-input');
	newVar.appendChild(varNameInput);

	const varTypeSpan = document.createElement('span');
	varTypeSpan.setAttribute('slot', 'variable-type');
	varTypeSpan.innerText = 'literal';
	newVar.appendChild(varTypeSpan);

	const valueData = document.createElement('span');
	valueData.setAttribute('slot', 'value-data');

	newVar.appendChild(valueData);

	container.appendChild(newVar);
}

setUpPage();

// (async function() {

// 	const container = document.getElementById('variables-container');
// 	const config = await requestConfig();

// 	for (const item of config) {
// 		const varEl = document.createElement('variable-element');

// 		const varNameSpan = document.createElement('span');
// 		varNameSpan.setAttribute('slot', 'variable-name');
// 		varNameSpan.innerText = item.variable_name;
// 		varEl.appendChild(varNameSpan);

// 		const varValueElement = document.createElement('span');
// 		varValueElement.setAttribute('slot', 'value');
// 		varValueElement.style.textAlign = 'left';

// 		if (item.type === 'array') {
// 			const listEl = document.createElement('ul');
// 			listEl.style.listStyle = 'none';
// 			listEl.style.padding = 0;
// 			const varValue = item.value.value;
// 			varValue.forEach(val => {
// 				const valueItem = document.createElement('li');
// 				valueItem.innerText = `${val},`;
// 				valueItem.style.margin = '5px 0';
// 				listEl.appendChild(valueItem);
// 			});
// 			const listElChildren = listEl.children;
// 			// remove the comma from the last one
// 			listElChildren[listElChildren.length - 1].innerText = listElChildren[listElChildren.length - 1].innerText.slice(0, -1);
// 			varValueElement.appendChild(listEl);

// 		} else if (item.type === 'object') {
// 			const listEl = document.createElement('ul');
// 			listEl.style.listStyle = 'none';
// 			listEl.style.padding = 0;
// 			const varValue = item.value.value;
// 			for (const key in varValue) {
// 				const valueItem = document.createElement('li');
// 				valueItem.innerHTML = `<strong>${key}</strong>: ${varValue[key]},`;
// 				valueItem.style.margin = '5px 0';
// 				listEl.appendChild(valueItem);
// 			} listElChildren = listEl.children;
// 			listElChildren[listElChildren.length - 1].innerHTML = listElChildren[listElChildren.length - 1].innerHTML.slice(0, -1);
// 			varValueElement.appendChild(listEl);

// 		} else {
// 			const p = document.createElement('p');
// 			p.innerText = item.value.value;
// 			varValueElement.appendChild(p);
// 		}

// 		varEl.appendChild(varValueElement);

// 		container.appendChild(varEl);
// 	}


// })();


