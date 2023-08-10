// const formatTime = (time) => {
//     return new Date(time).toLocaleTimeString([], {
//         hour: 'numeric',
//         minute: '2-digit',
//         hour12: true,
//     });
// };
const User = require('../models/schema')

function generateOTP() {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

async function sendOTPByEmail(email, otp) {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.email,
            pass: process.env.pass
        }
    });

    const mailOptions = {
        from: process.env.email,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is: ${otp}`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully');
    } catch (error) {
        console.log('Error sending OTP email', error);
    }
}


exports.loginUser = async(req, res) => {
    try {
        const { emailId, password, otp} = req.body;
        let user = await User.findOne({ emailId, password });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (password !== user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const newOTP = generateOTP();
        user.otp = newOTP;
        user.otpExpiration = Date.now() + 5 * 60 * 1000;

        await sendOTPByEmail(emailId, newOTP);

        user = await user.save();

        // Return the token and badgeID to the client
        res.json({ message: 'OTP sent successfully', badgeID: user.badgeID });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyOTP = async(req, res) => {
    try {
        let { badgeID, otp } = req.body;
        let user = await User.findOne({ badgeID });
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (user.otp !== otp || Date.now() > user.otpExpiration) {
            return res.status(401).json({ error: 'Invalid otp' });
        }

        const imageUrl = user.profilePic;

        user.otp = undefined;
        user.otpExpiration = undefined;

        user = await user.save();
        const token = jwt.sign({ emailId: user.emailId, badgeID: user.badgeID }, 
            secretKey, {
                expiresIn: '1d', 
            }
        );
        user.jwtToken = token;
        await user.save();

        res.json({ token, badgeID: user.badgeID, imageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.signup = async(req, res) => {
    try{
        const { emailId , password, password0 } = req.body;

        const admin = await User.findOne({ emailId:emailId });
        if(!admin){
            return res.status(250).json({error:'User with same email id already exists'});
        }
        if(password!=password0){
            return res.status(250).json({error:'Passwords do not match'});
        }
        const {firstName, surname, phoneNo, gender, income, expenses, debt, current_savings, investment_Returns, maritalStatus, number_of_children, age} = req.body;
        const user = new User({
            emailId:emailId,
            password:password,
            firstName:firstName,
            surname:surname,
            phoneNo:phoneNo,
            gender:gender,
            income:income,
            expenses:expenses,
            debt:debt,
            current_savings:current_savings,
            investment_Returns:investment_Returns,
            number_of_children:number_of_children,
            maritalStatus:maritalStatus,
            age:age
        });
        await user.save();
        res.json({message:'User added successfully',user});
    } catch(error){
        console.error(error);
        res.status(500).json({error: 'Error Signing up'});
    }
};