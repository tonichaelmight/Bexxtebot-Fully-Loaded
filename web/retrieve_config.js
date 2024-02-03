async function requestConfig() {
    console.log('requesting config');
	const url = 'http://localhost:6543/config';
	const response = await fetch(url);
	const data = await response.json();
	return data;
}