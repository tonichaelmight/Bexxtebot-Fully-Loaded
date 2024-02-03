class Variable extends HTMLElement {
	constructor() {
		super();
		let template = document.getElementById("variable-template");
		let templateContent = template.content;

		const shadowRoot = this.attachShadow({ mode: "closed" });
		shadowRoot.appendChild(templateContent.cloneNode(true));
	}

	connectedCallback() {

	}
}

customElements.define('variable-element', Variable);

(async function() {
	const container = document.getElementById('variables-container');

	const config = await requestConfig();
	console.log(config);

	for (const item of config) {
		const varEl = document.createElement('variable-element');

		const varNameSpan = document.createElement('span');
		varNameSpan.setAttribute('slot', 'variable-name');
		varNameSpan.innerText = item.variable_name;
		varEl.appendChild(varNameSpan);

		const varValueSpan = document.createElement('span');
		varValueSpan.setAttribute('slot', 'value');
		varValueSpan.innerText = item.value.value;
		varEl.appendChild(varValueSpan);

		container.appendChild(varEl);
	}
})();


