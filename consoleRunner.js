import { createInterface } from 'readline';
import { URL } from 'url';
import request from 'request';
const prompt = require('prompt-sync')();
import util from 'util';


const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {

    async promptForPostcode() {
        const postcode = await prompt('\nEnter your postcode: ');
        return postcode.replace(/\s/g, '');
    }

    displayStopPoints(stopPoints) {
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    async makeGetRequest(baseUrl, endpoint, parameters) {
        const url = this.buildUrl(baseUrl, endpoint, parameters);
        try {
            const response = await util.promisify(request.get)(url)
            return response.body;
        } catch (error) {
            console.log(error);
        }
    }

    async getLocationForPostCode(postcode) {
        const responseBody = await this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, []);
        const jsonBody = JSON.parse(responseBody);
        return { latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude };
    }

    async getNearestStopPoints(latitude, longitude, count) {
        const responseBody = await this.makeGetRequest(
            TFL_BASE_URL,
            `StopPoint`,
            [
                { name: 'stopTypes', value: 'NaptanPublicBusCoachTram' },
                { name: 'lat', value: latitude },
                { name: 'lon', value: longitude },
                { name: 'radius', value: 1000 },
                { name: 'app_id', value: '' /* Enter your app id here */ },
                { name: 'app_key', value: '' /* Enter your app key here */ }
            ]);
        const stopPoints = JSON.parse(responseBody).stopPoints.map(function (entity) {
            return { naptanId: entity.naptanId, commonName: entity.commonName };
        }).slice(0, count);
        return stopPoints;
    }

    async run() {
        const postcode = await this.promptForPostcode();
        const location = await this.getLocationForPostCode(postcode);
        const stopPoints = await this.getNearestStopPoints(location.latitude, location.longitude, 5);
        this.displayStopPoints(stopPoints);
    };
};
