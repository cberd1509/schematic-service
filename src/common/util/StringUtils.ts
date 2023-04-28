import { v4 as uuidv4 } from 'uuid';


export const makeId = (length: number):string=>{
    const uuid = uuidv4();
    uuid.replace(/-/g, '');
    return uuid.substr(0, length);
}