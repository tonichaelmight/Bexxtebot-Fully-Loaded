async function requestConfig() {
	const url = 'http://localhost:6543/config/all';
	const response = await fetch(url);
	const data = await response.json();
	return data;
}