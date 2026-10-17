export function allowedOrigin(req){
 try{return !req.headers.origin||new URL(req.headers.origin).host===req.headers.host||req.headers.origin===process.env.PUBLIC_ORIGIN}catch{return false}
}
