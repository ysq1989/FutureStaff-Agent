/** Platform-owned Agent scope narrows existing human permissions; never grants them. */
export const businessSystems=['shop','erp','product-hub','geo','visa','web'] as const
export type BusinessSystem=typeof businessSystems[number]
export function decodeBusinessSystems(value:unknown):BusinessSystem[]{
 if(!Array.isArray(value)||value.length>businessSystems.length||new Set(value).size!==value.length||value.some(item=>!businessSystems.includes(item as BusinessSystem)))throw Error('AGENT_CONTRACT_INVALID')
 return value as BusinessSystem[]
}
export function toolBusiness(name:string):BusinessSystem|undefined{
 if(name.startsWith('website_'))return 'web'
 if(name==='call_erp_api'||name.startsWith('erp_'))return 'erp'
 if(name.startsWith('shop_'))return 'shop'
 if(/^(product_hub_|hub_|market_|call_product_hub_api)/.test(name))return 'product-hub'
 if(/^(geo_|call_geo_api)/.test(name))return 'geo'
 if(/^(visa_|immigration_|call_immigration_api)/.test(name))return 'visa'
 return undefined
}
export function businessToolAllowed(name:string,scope:readonly BusinessSystem[]|undefined):boolean{
 const system=toolBusiness(name)
 return scope===undefined||system===undefined||scope.includes(system)
}
