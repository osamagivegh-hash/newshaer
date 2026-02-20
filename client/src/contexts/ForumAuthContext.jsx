import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ForumAuthContext = createContext();

export const useForumAuth = () => useContext(ForumAuthContext);

export const ForumAuthProvider = ({ children }) => {
    const [forumUser, setForumUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('forumToken');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.get('/api/forum-auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setForumUser(response.data.user);
            }
        } catch (error) {
            localStorage.removeItem('forumToken');
            setForumUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const forumLogin = (userData, token) => {
        localStorage.setItem('forumToken', token);
        setForumUser(userData);
    };

    const forumLogout = () => {
        localStorage.removeItem('forumToken');
        setForumUser(null);
    };

    return (
        <ForumAuthContext.Provider value={{ forumUser, loading, forumLogin, forumLogout, checkAuthStatus }}>
            {children}
        </ForumAuthContext.Provider>
    );
};
