const jwt = require("jsonwebtoken");

function authMiddleware(req,res,next){
    const authHeader = req.headers.authorization;
    //no header or wrong formate -> UNAUTHORIZED 
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({error:"No Token Provided"})
    }

    /**
     @description splits the header by space and takes the second part which is the token 
     @example output has ["Bearer", "eyJhbGciOi..."]
     @returns split[1] gets only the token 
     */
    const token = authHeader.split(" ")[1]
    try{
        //payload consist of user data (id, username)
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        //stores the decoded information in req.user
        req.user = payload;
        next();
    }catch(err){
        return res.status(401).json({error:"Invalid Token"})
    }
}
module.exports = authMiddleware