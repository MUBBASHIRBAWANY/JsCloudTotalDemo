// import axios from 'axios';
// import { useForm } from "react-hook-form";
// import { useDispatch } from 'react-redux';
// import { Link, useNavigate } from 'react-router-dom';
// import { ToastContainer, toast } from 'react-toastify';
// import Cookies from 'universal-cookie';
// import { Admin, user } from '../../../Redux/Reducers/LoginerReducer';
// import { fetchUserRights } from '../../../Redux/Reducers/UseRights';
// import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
// import { useState, useEffect } from 'react';
// import { CircularProgress } from '@mui/material';
// import { motion } from 'framer-motion';

// const Login = () => {
//     const [loading, setLoading] = useState(false);
//     const dispatch = useDispatch()
//     const navigate = useNavigate();

//     const valideUser = async () => {
//         const cookies = new Cookies();
//         const Token = cookies.get('token')
//         if (!Token) return;

//         try {
//             const response = await createDataFunction('users/profile', { authorization: Token });
//             if (response.data.val.email == "admin@js.com") {
//                 const role = await getDataFundtion(`userRole/role/${response.data.val.selectRole}`)
//                 dispatch(fetchUserRights(role.data.Roles))
//                 dispatch(Admin(response.data.val))
//                 navigate('/dashboard');
//             } else {
//                 const role = await getDataFundtion(`userRole/role/${response.data.val.selectRole}`)
//                 dispatch(fetchUserRights(role.data.Roles))
//                 dispatch(user(response.data.val))
//                 navigate('/dashboard');
//             }
//         } catch (err) {
//             cookies.remove('token');
//         }
//     }

//     useEffect(() => {
//         valideUser();
//     }, []);

//     const { register, handleSubmit, formState: { errors } } = useForm();

//     const onSubmit = async (data) => {
//         setLoading(true);
//         try {
//             const res = await createDataFunction(`users/Login/`, data);
//             const cookies = new Cookies();
//             cookies.set('token', res.data.token);

//             const response = await createDataFunction('users/profile', {
//                 authorization: res.data.token,
//             });

//             if (data.email === "admin@js.com") {
//                 const role = await getDataFundtion(
//                     `userRole/role/${response.data.val.selectRole}`
//                 );
//                 dispatch(fetchUserRights(role.data.Roles));
//                 dispatch(Admin(response.data.val));
//             } else {
//                 const role = await getDataFundtion(
//                     `userRole/role/${response.data.val.selectRole}`
//                 );
//                 dispatch(fetchUserRights(role.data.Roles));
//                 dispatch(user(response.data.val));
//             }

//             toast.success("Login successful!");
//             setTimeout(() => navigate('/dashboard'), 1500);
//         } catch (err) {
//             toast.error("Invalid credentials");
//         } finally {
//             setLoading(false);
//         }
//     };
import axios from 'axios';
import { useForm } from "react-hook-form";
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import Cookies from 'universal-cookie';
import { Admin, user } from '../../../Redux/Reducers/LoginerReducer';
import { fetchUserRights } from '../../../Redux/Reducers/UseRights';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { clearLoggedOut, clearTokenCookies, isLoggedOut } from '../../../utils/authSession.js';
import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import ThemeToggle from '../../Global/ThemeToggle.jsx';
import { useThemeMode } from '../../../theme/ThemeModeContext.jsx';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch()
    const [showPassword, setShowPassword] = useState(false)
    const { isDark } = useThemeMode()

    const applyRoleRights = async (selectRole) => {
        if (!selectRole) {
            dispatch(fetchUserRights([]))
            return
        }
        const role = await getDataFundtion(`userRole/role/${selectRole}`)
        const rights = role?.data?.Roles
        dispatch(fetchUserRights(Array.isArray(rights) ? rights : []))
    }
    useEffect(() => {
        let active = true
        const restoreSession = async () => {
            if (isLoggedOut()) {
                clearTokenCookies()
                return
            }
            const cookies = new Cookies();
            const Token = cookies.get('token')
            if (!Token) return

            try {
                const response = await createDataFunction('users/profile', { authorization: Token });
                if (!active || isLoggedOut()) return
                console.log(response.data.val.email)
                if (response.data.val.email == "admin@js.com") {
                    console.log("Admin")
                    await applyRoleRights(response.data.val.selectRole)
                    if (!active || isLoggedOut()) return
                    dispatch(Admin(response.data.val))
                }
                else {
                    console.log(response.data.val)
                    await applyRoleRights(response.data.val.selectRole)
                    if (!active || isLoggedOut()) return
                    dispatch(user(response.data.val))
                    console.log("user")
                }

            } catch (err) {
            }
        }
        restoreSession()
        return () => { active = false }
    }, [dispatch])


    const { register, handleSubmit, watch, formState: { errors } } = useForm();


    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const res = await createDataFunction(`users/Login/`, data);

            clearTokenCookies();
            const cookies = new Cookies();
            cookies.set('token', res.data.token, { path: '/' });
            clearLoggedOut();
            

            const Token = res.data.token;
            console.log(Token);
            
            const response = await createDataFunction('users/profile', {
                authorization: Token,
            });
            
            if (data.email === "admin@js.com") {
                await applyRoleRights(response.data.val.selectRole);
                dispatch(Admin(response.data.val));
            } else {
                await applyRoleRights(response.data.val.selectRole);
                dispatch(user(response.data.val));
            }
            setLoading(false);
            console.log("Login success:", response.data);
        } catch (err) {
            toast.error("Invalid User");
        } finally {
            setLoading(false);
        }
    };
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.8,
                when: "beforeChildren",
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const leftColumnVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    const rightColumnVariants = {
        hidden: { x: 50, opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut", delay: 0.2 }
        }
    };

    return (
        <>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={isDark ? 'dark' : 'light'}
            />

           <motion.div
  initial="hidden"
  animate="visible"
  variants={containerVariants}
  className="relative min-h-screen flex overflow-hidden bg-background"
>
  <div className="absolute top-4 right-4 z-20">
    <ThemeToggle className="bg-surface-container-lowest border border-[var(--pd-border-card)] shadow-sm" />
  </div>
  {/* Left Column - Premium Brand Section */}
  <motion.div
    variants={leftColumnVariants}
    className="hidden lg:flex lg:w-2/5 relative overflow-hidden items-center justify-center"
    style={{
      background: 'linear-gradient(135deg, var(--pd-primary) 0%, #001848 100%)',
      position: 'relative'
    }}
  >
    {/* Animated Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
    
    {/* Animated Particles Background */}
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            y: [null, -100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 5 + 3,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>

    {/* Content */}
    <div className="relative z-10 text-center px-12">
      {/* Premium Logo with Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-10"
      >
        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
        <img
          src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png"
          alt="Logo"
          className="h-32 w-auto mx-auto relative filter brightness-0 invert"
        />
      </motion.div>

      {/* Brand Name with Elegant Typography */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-5xl md:text-6xl font-light tracking-wide text-white"
        style={{
          textShadow: '0 2px 20px rgba(0,0,0,0.1)',
          letterSpacing: '0.15em'
        }}
      >
        PEARL DYNAMIC
      </motion.h1>

      {/* Elegant Divider */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "80px", opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="h-px bg-gradient-to-r from-transparent via-white to-transparent mx-auto my-8"
      />

      {/* Tagline with Refined Typography */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto font-light"
      >
        Premium distribution management software solution designed for modern enterprises
      </motion.p>
    </div>

    {/* Subtle Corner Accent */}
    <div className="absolute bottom-8 right-8 opacity-20">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M0 40L40 0V40H0Z" fill="white" />
      </svg>
    </div>
  </motion.div>

  {/* Right Column - Premium Login Form */}
  <motion.div
    variants={rightColumnVariants}
    className="w-full lg:w-3/5 flex items-center justify-center p-8 md:p-12 bg-surface-container-lowest border-l border-[var(--pd-border-card)]"
  >
    {/* Premium Background Pattern */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }} />
    </div>

    <div className="w-full max-w-md relative z-10">
      {/* Mobile Logo */}
      <div className="lg:hidden text-center mb-10">
        <img
          src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png"
          alt="Company Logo"
          className="h-12 w-auto mx-auto"
        />
      </div>

      {/* Form Header with Premium Styling */}
      <motion.div variants={itemVariants} className="mb-10">
        <h2 className="text-4xl font-semibold text-on-surface tracking-tight">
          Welcome back
        </h2>
        <div className="h-px w-12 bg-gradient-to-r from-primary to-transparent my-4" />
        <p className="text-on-surface-variant font-normal">
          Sign in to access your premium dashboard
        </p>
      </motion.div>

      {/* Premium Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {/* Username Field with Premium Focus Effect */}
        <motion.div variants={itemVariants} className="space-y-2">
          <label className="block text-sm font-medium text-on-surface tracking-wide">
            Username
          </label>
          <div className="relative group">
            <input
              type="text"
              {...register("firstname", { required: true })}
              className="w-full px-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-md text-on-surface placeholder-on-surface-variant text-sm focus:outline-none focus:border-primary focus:border-2 transition-all duration-300 ease-out group-hover:border-outline"
              placeholder="Enter your username"
            />
            <div className="absolute inset-0 rounded-md pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" 
                 style={{
                   boxShadow: '0 0 0 4px rgba(0, 49, 128, 0.08)'
                 }} 
            />
          </div>
          {errors.firstname && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-error mt-1"
            >
              Username is required
            </motion.p>
          )}
        </motion.div>

        {/* Password Field with Show/Hide Toggle (Premium) */}
        <motion.div variants={itemVariants} className="space-y-2">
          <label className="block text-sm font-medium text-on-surface tracking-wide">
            Password
          </label>
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: true })}
              className="w-full px-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-md text-on-surface placeholder-on-surface-variant text-sm focus:outline-none focus:border-primary focus:border-2 transition-all duration-300 ease-out group-hover:border-outline pr-12"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {showPassword ? (
                <span className="w-4 h-4" >hide</span>
              ) : (
                <span className="w-4 h-4" >show</span>
              )}
            </button>
          </div>
          {errors.password && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-error mt-1"
            >
              Password is required
            </motion.p>
          )}
        </motion.div>

        {/* Remember Me & Forgot Password with Premium Toggle */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <label className="flex items-center space-x-2.5 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
              />
              <div className="w-4 h-4 border-2 border-outline-variant rounded-sm group-hover:border-outline transition-colors peer-checked:bg-primary peer-checked:border-primary peer-checked:relative">
                <svg className="absolute inset-0 w-full h-full text-white p-0.5 hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
              Remember me
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-on-surface-variant hover:text-primary transition-colors relative group"
          >
            Forgot password?
            <span className="absolute bottom-0 left-0 w-full h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </Link>
        </motion.div>

        {/* Premium Submit Button with Hover Effect */}
        <motion.div variants={itemVariants}>
          <button
            type="submit"
            disabled={loading}
            className="relative w-full bg-secondary hover:bg-secondary-dark text-on-secondary py-3.5 px-4 rounded-md text-sm font-medium transform transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none flex items-center justify-center gap-2 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            {loading ? (
              <>
                <CircularProgress size={18} color="inherit" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </motion.div>

        {/* Premium Sign Up Link */}
        <motion.p
          variants={itemVariants}
          className="text-center text-sm text-on-surface-variant"
        >
          New to Pearl Dynamic?{' '}
          <Link
            to="/Signup"
            className="text-primary font-medium hover:text-primary-container transition-colors relative inline-block group"
          >
            Create account
            <span className="absolute bottom-0 left-0 w-full h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </Link>
        </motion.p>
      </form>
    </div>
  </motion.div>
</motion.div>
        </>
    );
}

export default Login;

// import axios from 'axios';
// import { useForm } from "react-hook-form";
// import { useDispatch } from 'react-redux';
// import { Link, useNavigate } from 'react-router-dom';
// import { ToastContainer, toast } from 'react-toastify';
// import Cookies from 'universal-cookie';
// import { Admin, user } from '../../../Redux/Reducers/LoginerReducer';
// import { fetchUserRights } from '../../../Redux/Reducers/UseRights';
// import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

// const Login = () => {
//     const dispatch = useDispatch()
//     const valideUser = async () => {
//         const cookies = new Cookies();
//         const Token = cookies.get('token')
//         try {
//             const response = await createDataFunction('users/profile', { authorization: Token });
//             //console.log(response.data.val.email)
//             if (response.data.val.email == "admin@js.com") {
//                 //console.log("Admin")
//                 const role = await getDataFundtion(`userRole/role/${response.data.val.selectRole}`)
//                 dispatch(fetchUserRights(role.data.Roles))
//                 dispatch(Admin(response.data.val))
//             }
//             else {
//                 //console.log(response.data.val)
//                 const role = await getDataFundtion(`userRole/role/${response.data.val.selectRole}`)
//                 //console.log(role)
//                 dispatch(fetchUserRights(role.data.Roles))
//                 dispatch(user(response.data.val))
//                 //console.log("user")
//             }
            
//         } catch (err) {
//         }
//     }
//     valideUser()


//     const { register, handleSubmit, watch, formState: { errors } } = useForm();


//   const onSubmit = async (data) => {
//   try {
//     const res = await createDataFunction(`users/Login/`, data);

//     const cookies = new Cookies();
//     cookies.set('token', res.data.token);

//     const Token = res.data.token;

//     const response = await createDataFunction('users/profile', {
//       authorization: Token,
//     });

//     if (data.email === "admin@js.com") {
//       const role = await getDataFundtion(
//         `userRole/role/${response.data.val.selectRole}`
//       );
//       dispatch(fetchUserRights(role.data.Roles));
//       dispatch(Admin(response.data.val));
//     } else {
//       const role = await getDataFundtion(
//         `userRole/role/${response.data.val.selectRole}`
//       );
//       dispatch(fetchUserRights(role.data.Roles));
//       dispatch(user(response.data.val));
//     }

//     //console.log("Login success:", response.data);
//   } catch (err) {
//     toast.error("Invalid User");
//   }
// };


//     return (
//         <div>
//             <ToastContainer />
//             <section className="pd-bg-muted">
//                 <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
//                     <a href="#" className="flex items-center mb-6 text-2xl font-semibold pd-text-body">
//                         <img className="w-30 h-40 mr-2" src="https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png" alt="logo" />

//                     </a>
//                     <div className="w-full pd-bg-surface rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0">
//                         <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
//                             <h1 className="text-xl font-bold leading-tight tracking-tight pd-text-body md:text-2xl">
//                                 Sign in to your account
//                             </h1>
//                             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6" action="#">
//                                 <div>
//                                     <label htmlFor="firstname" className="block mb-2 text-sm font-medium pd-text-body">Your UserName</label>
//                                     <input type="Text" {...register("firstname")} name="firstname" id="firstname" className="pd-bg-muted border pd-border-default border pd-text-body rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:placeholder-gray-400" placeholder="name@company.com" required="" />
//                                 </div>
//                                 <div>
//                                     <label htmlFor="password" className="block mb-2 text-sm font-medium pd-text-body">Password</label>
//                                     <input type="password" {...register("password")} name="password" id="password" placeholder="••••••••" className="pd-bg-muted border pd-border-default border pd-text-body rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:placeholder-gray-400" required="" />
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                     <div className="flex items-start">
//                                         <div className="flex items-center h-5">
//                                             <input id="remember" aria-describedby="remember" type="checkbox" className="w-4 h-4 border pd-border-default border rounded pd-bg-muted focus:ring-3 focus:ring-primary-300 dark:ring-offset-gray-800" required="" />
//                                         </div>
//                                         <div className="ml-3 text-sm">
//                                             <label htmlFor="remember" className="pd-text-muted">Remember me</label>
//                                         </div>
//                                     </div>
//                                     <a href="#" className="text-sm font-medium text-primary-600 hover:underline">Forgot password?</a>
//                                 </div>
//                                 <button type="submit" className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-blue-700">Sign in</button>
//                                 <p className="text-sm font-light pd-text-muted">
//                                     Don’t have an account yet? <Link to="/Signup" className="font-medium text-primary-600 hover:underline">Sign up</Link>
//                                 </p>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             </section>
//         </div>
//     )
// }
// export default Login