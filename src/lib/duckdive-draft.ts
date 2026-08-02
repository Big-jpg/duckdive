export const DUCKDIVE_DRAFT_VERSION="v1";
export const DUCKDIVE_DRAFT_MAX_AGE_MS=24*60*60*1000;

type DraftStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;
type StoredDraft={version:typeof DUCKDIVE_DRAFT_VERSION;text:string;createdAt:number};

export function duckDiveDraftKey(starterKey:string){
  return `duckdive:draft:${DUCKDIVE_DRAFT_VERSION}:${starterKey}`;
}

export function saveDuckDiveDraft(storage:DraftStorage,starterKey:string,text:string,now=Date.now()){
  const value=text.trim();
  if(!value)return false;
  try{
    const draft:StoredDraft={version:DUCKDIVE_DRAFT_VERSION,text:value,createdAt:now};
    storage.setItem(duckDiveDraftKey(starterKey),JSON.stringify(draft));
    return true;
  }catch{return false;}
}

export function loadDuckDiveDraft(storage:DraftStorage,starterKey:string,now=Date.now()){
  const key=duckDiveDraftKey(starterKey);
  try{
    const raw=storage.getItem(key);
    if(!raw)return "";
    const draft=JSON.parse(raw) as Partial<StoredDraft>;
    if(draft.version!==DUCKDIVE_DRAFT_VERSION||typeof draft.text!=="string"||typeof draft.createdAt!=="number"||now-draft.createdAt>DUCKDIVE_DRAFT_MAX_AGE_MS){
      storage.removeItem(key);
      return "";
    }
    return draft.text.trim();
  }catch{
    try{storage.removeItem(key);}catch{}
    return "";
  }
}

export function clearDuckDiveDraft(storage:DraftStorage,starterKey:string){
  try{storage.removeItem(duckDiveDraftKey(starterKey));}catch{}
}
