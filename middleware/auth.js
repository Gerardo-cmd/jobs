import jwt from "jsonwebtoken";
const authenticate = (req, res, next) => {
    const token = req.header('Authorization').split(' ')[1];
    let decodedToken;
    try{
        // Verify token
        decodedToken = jwt.verify(token, process.env.SECRET);
    } catch(err) {
        res.status(400).json({"Error": "Please Authenticate"})
    }
    if (!decodedToken) {
        return;
    }
    req.email = decodedToken;
    next();
}
export default authenticate; 