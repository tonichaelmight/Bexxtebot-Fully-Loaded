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