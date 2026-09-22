export const manualBase = language => 'https://www.tesla.com/ownersmanual/modely/'+(language==='en'?'en_eu':'de_de')+'/';
export function readLanguage(storage) {
  try { return storage.getItem('juniper-language')==='en'?'en':'de'; }
  catch { return 'de'; }
}
export function saveLanguage(storage, language) {
  try { storage.setItem('juniper-language',language==='en'?'en':'de'); }
  catch { /* The current session remains usable without storage. */ }
}
