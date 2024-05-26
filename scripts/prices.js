import { getEventEmitter } from './event_bus.js';
import { sleep } from './utils.js';

/**
 * @typedef {Object} Currency
 * @property {string} currency - The type of currency
 * @property {number} value - The value of the currency
 * @property {number} last_updated - The timestamp when this value was last updated
 */

/**
 * Oracle's primary instance.
 *
 * @todo Allow an array of Oracle instances for better privacy and decentralisation
 */
export const ORACLE_BASE = 'https://pepeblocks.com/ext';

/**
 * An Oracle instance
 */
export class Oracle {
    /**
     * The currencies cache map
     * @type {Map<string, Currency>} Map to store currency objects
     */
    mapCurrencies = new Map();

    /**
     * A lock-like flag which waits until at least once successful "full fetch" of currencies has occurred.
     * This flag massively lowers bandwidth by only fetching the bulk once, falling to per-currency APIs afterwards.
     */
    #fLoadedCurrencies = false;

    /**
     * Get the cached price in a specific display currency
     * @param {string} strCurrency - The Oracle display currency
     * @return {Number}
     */
    getCachedPrice(strCurrency) {
        return this.mapCurrencies.get(strCurrency)?.value || 0;
    }

    /**
     * Get a cached list of the supported display currencies
     *
     * **Note:** This is a read-only array, use the {@link mapCurrencies} map to mutate the cache
     * @returns {Array<Currency>} - A list of Oracle-supported display currencies
     */
    getCachedCurrencies() {
        return Array.from(this.mapCurrencies.values());
    }

    /**
     * Get the price in a specific display currency with extremely low bandwidth
     * @param {string} strCurrency - The Oracle display currency
     * @return {Promise<Number>}
     */
    async getPrice(strCurrency) {
        try {


            //getcurrentprice

            const cReq = await fetch(`${ORACLE_BASE}/getcurrentprice`);

            // If the request fails, we'll try to fallback to cache, otherwise return a safe empty state
            if (!cReq.ok) {
                //console.log(cReq);
                return this.getCachedPrice(strCurrency);
            }

            var cCurrency = await cReq.json();

            cCurrency = { "currency": "usd", "value": cCurrency.last_price_usdt }

            //console.log(JSON.stringify(cCurrency))

            // Update it
            this.mapCurrencies.set(strCurrency, cCurrency);

            return cCurrency.value;

            /*const cReq = await fetch(`${ORACLE_BASE}/price/${strCurrency}`);

            // If the request fails, we'll try to fallback to cache, otherwise return a safe empty state
            if (!cReq.ok) return this.getCachedPrice(strCurrency);

            const cCurrency = await cReq.json();

            // Update it
            this.mapCurrencies.set(strCurrency, cCurrency);

            // And finally return it
            return cCurrency.value;*/
        } catch (e) {
            console.warn(
                'Oracle: Failed to fetch ' +
                strCurrency.toUpperCase() +
                ' price!'
            );
            console.warn(e);
            return this.getCachedPrice(strCurrency);
        }
    }

    /**
     * Get a list of the supported display currencies
     *
     * This should only be used sparingly due to higher bandwidth, prefer {@link getPrice} if you need fresh data for a single, or select few currencies.
     *
     * See {@link #fLoadedCurrencies} for more info on Oracle bandwidth saving.
     * @returns {Promise<Array<Currency>>} - A list of Oracle-supported display currencies
     */
    async getCurrencies() {
        try {

            //return [{"currency":"btc","value":0.00000512,"last_updated":1716332139}];

            const arrCurrencies = [{ "currency": "usd", "value": 0, "last_updated": 0 }];

            // Loop each currency and update the cache
            for (const cCurrency of arrCurrencies) {
                this.mapCurrencies.set(cCurrency.currency, cCurrency);
            }

            // Now we've loaded all currencies: we'll flag it and use the lower bandwidth price fetches in the future
            this.#fLoadedCurrencies = true;
            return arrCurrencies;




            /*const cReq = await fetch(`${ORACLE_BASE}/currencies`);

            // If the request fails, we'll try to fallback to cache, otherwise return a safe empty state
            if (!cReq.ok) return this.getCachedCurrencies();

            const arrCurrencies = await cReq.json();

            console.log(JSON.stringify(arrCurrencies));

            // Loop each currency and update the cache
            for (const cCurrency of arrCurrencies) {
                this.mapCurrencies.set(cCurrency.currency, cCurrency);
            }

            // Now we've loaded all currencies: we'll flag it and use the lower bandwidth price fetches in the future
            this.#fLoadedCurrencies = true;
            return arrCurrencies;*/

        } catch (e) {
            console.warn('Oracle: Failed to fetch currencies!');
            console.warn(e);
            return this.getCachedCurrencies();
        }
    }

    async load() {
        while (!this.#fLoadedCurrencies) {
            await this.getCurrencies();
            if (!this.#fLoadedCurrencies) await sleep(5000);
        }
        // Update any listeners for the full currency list (Settings, etc)
        getEventEmitter().emit('currency-loaded', this.mapCurrencies);
        // Update the balance to render the price instantly
        getEventEmitter().emit('balance-update');
    }
}

/**
 * The user-selected Price Oracle, used for all price data
 * @type {Oracle}
 */
export let cOracle = new Oracle();
