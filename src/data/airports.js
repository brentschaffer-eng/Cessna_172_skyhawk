/**
 * Each airport's longest runway. `lat`/`lon` is the runway threshold the aircraft lines up on and
 * `heading` is TRUE (from the threshold toward the far end). Vancouver, Calgary, Edmonton and
 * Winnipeg come from OurAirports (public domain). The rest are the ends of the runway centrelines
 * in OpenStreetMap (© OpenStreetMap contributors, ODbL), which are traced from aerial imagery and
 * so line up with the satellite ground; their elevations are OurAirports threshold elevations.
 */
export const AIRPORT_GROUPS = [
  {
    region: 'British Columbia',
    airports: [
      { id: 'CYVR', name: 'Vancouver (CYVR)', elevation: 14, runway: { id: '08R', heading: 100.3, lengthFt: 11500 }, lat: 49.190102, lon: -123.208000 },
      { id: 'CYYJ', name: 'Victoria (CYYJ)', elevation: 53, runway: { id: '09', heading: 106.1, lengthFt: 7081 }, lat: 48.651906, lon: -123.439861 },
      { id: 'CYLW', name: 'Kelowna (CYLW)', elevation: 1421, runway: { id: '16', heading: 174.9, lengthFt: 7830 }, lat: 49.966062, lon: -119.379175 },
      { id: 'CYXX', name: 'Abbotsford (CYXX)', elevation: 167, runway: { id: '07', heading: 85.7, lengthFt: 9274 }, lat: 49.019099, lon: -122.380012 },
      { id: 'CYXS', name: 'Prince George (CYXS)', elevation: 2232, runway: { id: '15', heading: 170.6, lengthFt: 11430 }, lat: 53.899490, lon: -122.670824 },
    ],
  },
  {
    region: 'Alberta',
    airports: [
      { id: 'CYYC', name: 'Calgary (CYYC)', elevation: 3557, runway: { id: '35R', heading: 360, lengthFt: 14000 }, lat: 51.110001, lon: -113.989998 },
      { id: 'CYEG', name: 'Edmonton (CYEG)', elevation: 2373, runway: { id: '02', heading: 33.9, lengthFt: 11000 }, lat: 53.308899, lon: -113.596001 },
    ],
  },
  {
    region: 'Saskatchewan',
    airports: [
      { id: 'CYQR', name: 'Regina (CYQR)', elevation: 1894, runway: { id: '13', heading: 138.0, lengthFt: 7894 }, lat: 50.440241, lon: -104.672423 },
      { id: 'CYXE', name: 'Saskatoon (CYXE)', elevation: 1653, runway: { id: '09', heading: 100.9, lengthFt: 8101 }, lat: 52.178446, lon: -106.717738 },
    ],
  },
  {
    region: 'Manitoba',
    airports: [
      { id: 'CYWG', name: 'Winnipeg (CYWG)', elevation: 783, runway: { id: '36', heading: 9.3, lengthFt: 11000 }, lat: 49.895599, lon: -97.241699 },
    ],
  },
  {
    region: 'Ontario',
    airports: [
      { id: 'CYYZ', name: 'Toronto (CYYZ)', elevation: 564, runway: { id: '05', heading: 46.4, lengthFt: 11110 }, lat: 43.674143, lon: -79.664093 },
      { id: 'CYOW', name: 'Ottawa (CYOW)', elevation: 349, runway: { id: '14', heading: 126.4, lengthFt: 9985 }, lat: 45.327021, lon: -75.686243 },
      { id: 'CYHM', name: 'Hamilton (CYHM)', elevation: 772, runway: { id: '12', heading: 107.3, lengthFt: 9982 }, lat: 43.180581, lon: -79.952989 },
      { id: 'CYKF', name: 'Kitchener-Waterloo (CYKF)', elevation: 1024, runway: { id: '08', heading: 65.1, lengthFt: 6988 }, lat: 43.457967, lon: -80.389737 },
      { id: 'CYXU', name: 'London (CYXU)', elevation: 912, runway: { id: '15', heading: 138.7, lengthFt: 8895 }, lat: 43.042312, lon: -81.160104 },
      { id: 'CYQG', name: 'Windsor (CYQG)', elevation: 621, runway: { id: '07', heading: 62.5, lengthFt: 9180 }, lat: 42.273359, lon: -82.970342 },
      { id: 'CYSB', name: 'Sudbury (CYSB)', elevation: 1129, runway: { id: '04', heading: 29.4, lengthFt: 6553 }, lat: 46.617732, lon: -80.804867 },
      { id: 'CYQT', name: 'Thunder Bay (CYQT)', elevation: 653, runway: { id: '07', heading: 70.5, lengthFt: 7300 }, lat: 48.370122, lon: -89.333769 },
    ],
  },
  {
    region: 'Quebec',
    airports: [
      { id: 'CYUL', name: 'Montréal (CYUL)', elevation: 96, runway: { id: '06L', heading: 42.6, lengthFt: 10986 }, lat: 45.461075, lon: -73.764992 },
      { id: 'CYQB', name: 'Québec City (CYQB)', elevation: 244, runway: { id: '06', heading: 44.6, lengthFt: 8982 }, lat: 46.782424, lon: -71.406302 },
    ],
  },
  {
    region: 'New Brunswick',
    airports: [
      { id: 'CYFC', name: 'Fredericton (CYFC)', elevation: 64, runway: { id: '09', heading: 69.8, lengthFt: 7926 }, lat: 45.863046, lon: -66.552176 },
      { id: 'CYQM', name: 'Moncton (CYQM)', elevation: 223, runway: { id: '06', heading: 42.4, lengthFt: 9949 }, lat: 46.106043, lon: -64.694263 },
      { id: 'CYSJ', name: 'Saint John (CYSJ)', elevation: 296, runway: { id: '05', heading: 30.9, lengthFt: 7204 }, lat: 45.301941, lon: -65.895163 },
    ],
  },
  {
    region: 'Nova Scotia',
    airports: [
      { id: 'CYHZ', name: 'Halifax (CYHZ)', elevation: 449, runway: { id: '05', heading: 35.0, lengthFt: 10493 }, lat: 44.865652, lon: -63.527261 },
    ],
  },
  {
    region: 'Prince Edward Island',
    airports: [
      { id: 'CYYG', name: 'Charlottetown (CYYG)', elevation: 155, runway: { id: '03', heading: 8.8, lengthFt: 6946 }, lat: 46.279759, lon: -63.127316 },
    ],
  },
  {
    region: 'Newfoundland and Labrador',
    airports: [
      { id: 'CYYT', name: 'St. John’s (CYYT)', elevation: 458, runway: { id: '10', heading: 85.9, lengthFt: 8454 }, lat: 47.623629, lon: -52.771588 },
    ],
  },
  {
    region: 'Yukon',
    airports: [
      { id: 'CYXY', name: 'Whitehorse (CYXY)', elevation: 2275, runway: { id: '14R', heading: 159.3, lengthFt: 8385 }, lat: 60.719550, lon: -135.075033 },
    ],
  },
  {
    region: 'Northwest Territories',
    airports: [
      { id: 'CYZF', name: 'Yellowknife (CYZF)', elevation: 674, runway: { id: '16', heading: 176.0, lengthFt: 7422 }, lat: 62.473142, lon: -114.443970 },
    ],
  },
  {
    region: 'Nunavut',
    airports: [
      { id: 'CYFB', name: 'Iqaluit (CYFB)', elevation: 110, runway: { id: '16', heading: 135.6, lengthFt: 8572 }, lat: 63.764981, lon: -68.574681 },
    ],
  },
]

export const AIRPORTS = AIRPORT_GROUPS.flatMap((group) => group.airports)

export const DEFAULT_AIRPORT = AIRPORTS.find((a) => a.id === 'CYYC')
