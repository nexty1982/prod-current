
import { createContext, useState, useEffect } from 'react';
import { PostType, profiledataType } from '../../types/apps/userProfile';
import React from "react";
import useSWR from 'swr';
import { getFetcher, postFetcher } from '@/globalFetcher';
import { useAuth } from '../AuthContext';

// Define context type
export type UserDataContextType = {
    posts: PostType[];
    users: any[];
    gallery: any[];
    loading: boolean;
    profileData: profiledataType;
    followers: any[];
    search: string;
    error: null;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    addGalleryItem: (item: any) => void;
    addReply: (postId: number, commentId: number, reply: string) => void;
    likePost: (postId: number) => void;
    addComment: (postId: number, comment: string) => void;
    likeReply: (postId: number, commentId: number) => void;
    toggleFollow: (id: number) => void;
    updateProfileData: (data: Partial<profiledataType>) => void;
};

// Create context
export const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Default config values
const config = {
    posts: [],
    users: [],
    gallery: [],
    followers: [],
    search: '',
    loading: true,
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<PostType[]>(config.posts);
    const [users, setUsers] = useState<any[]>(config.users);
    const [gallery, setGallery] = useState<any[]>(config.gallery);
    const [followers, setFollowers] = useState<any[]>(config.followers);
    const [search, setSearch] = useState<string>(config.search);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(config.loading);
    
    // Get the actual authenticated user ID from auth context
    const { user } = useAuth();
    const userId = user?.id || 1; // Use authenticated user ID, fallback to 1 for compatibility
    
    // Load profile data from localStorage or use defaults based on authenticated user
    const getInitialProfileData = (): profiledataType => {
        // If we have an authenticated user, use their basic info
        if (user) {
            const userName = user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.username || user.email || 'User';
                
            return {
                name: userName,
                role: user.role || 'User',
                avatar: '/orthodox/avatars/default.svg', // Will be updated from API
                coverImage: '/orthodox/banners/default.svg', // Will be updated from API
                postsCount: 0,
                followersCount: 0,
                followingCount: 0,
            };
        }
        
        // Try to load from localStorage as fallback
        try {
            const savedProfile = localStorage.getItem('orthodoxmetrics_profile_data');
            if (savedProfile) {
                return JSON.parse(savedProfile);
            }
        } catch (error) {
            console.error('Error loading profile from localStorage:', error);
        }
        
        // Final fallback - completely generic default
        return {
            name: 'User',
            role: 'User',
            avatar: '/orthodox/avatars/default.svg',
            coverImage: '/orthodox/banners/default.svg',
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
        };
    };
    
    const defaultProfile = getInitialProfileData();
    const [profileData, setProfileData] = useState<profiledataType>(defaultProfile);

    // Reset profile data when user changes (different user logs in)
    useEffect(() => {
        const newProfile = getInitialProfileData();
        setProfileData(newProfile);
    }, [user?.id]); // Re-run when user ID changes

    // OrthodoxMetrics API endpoints
    const profKey = `/api/om/profile/${userId}`;
    const postsKey = `/api/om/profile/${userId}/posts?page=1&limit=50`;
    const galleryKey = `/api/om/profile/${userId}/gallery`;
    const follKey = `/api/om/profile/${userId}/followers`;

    const { data: profileDataApi, isLoading: isProfileLoading, error: profileError } = useSWR(profKey, getFetcher);
    const { data: postsData, isLoading: isPostsLoading, error: postsError, mutate } = useSWR(postsKey, getFetcher);
    const { data: galleryData, isLoading: isGalleryLoading, error: galleryError } = useSWR(galleryKey, getFetcher);
    const { data: followersData, isLoading: isFollowersLoading, error: followersError } = useSWR(follKey, getFetcher);

    useEffect(() => {
        if (profileDataApi && postsData && galleryData && followersData) {
            // Update profile data from API
            if (profileDataApi && profileDataApi.ok && profileDataApi.profile) {
                const apiProfile = profileDataApi.profile;
                const updatedProfile: profiledataType = {
                    name: `${apiProfile.first_name || ''} ${apiProfile.last_name || ''}`.trim() || apiProfile.username || 'Unknown User',
                    role: apiProfile.role || 'User',
                    avatar: apiProfile.avatarUrl || apiProfile.avatar_url || defaultProfile.avatar,
                    coverImage: apiProfile.bannerUrl || apiProfile.banner_url || defaultProfile.coverImage,
                    postsCount: defaultProfile.postsCount,
                    followersCount: defaultProfile.followersCount,
                    followingCount: defaultProfile.followingCount,
                };
                setProfileData(updatedProfile);
                
                // Save to localStorage
                try {
                    localStorage.setItem('orthodoxmetrics_profile_data', JSON.stringify(updatedProfile));
                } catch (error) {
                    console.error('Error saving profile to localStorage:', error);
                }
            }
            
            // Update posts
            if (postsData.ok && postsData.rows) {
                setPosts(postsData.rows);
            }
            
            // Update gallery
            if (galleryData.ok && galleryData.rows) {
                setGallery(galleryData.rows);
            }
            
            // Update followers
            if (followersData.ok && followersData.rows) {
                setFollowers(followersData.rows);
            }
            
            setLoading(false);
        } else if (profileError || postsError || galleryError || followersError) {
            setError(profileError || postsError || galleryError || followersError);
            setLoading(false);
        } else {
            setLoading(isProfileLoading || isPostsLoading || isGalleryLoading || isFollowersLoading);
        }
    }, [profileDataApi, postsData, galleryData, followersData, isProfileLoading, isPostsLoading, isGalleryLoading, isFollowersLoading, profileError, postsError, galleryError, followersError]);

    // Function to add a new item to the gallery
    const addGalleryItem = (item: any) => {
        setGallery((prevGallery) => [...prevGallery, item]);
    };

    // Function to toggle follow/unfollow status of a user
    const toggleFollow = (id: number) => {
        setFollowers((prevFollowers) =>
            prevFollowers.map((follower) =>
                follower.id === id ? { ...follower, isFollowed: !follower.isFollowed } : follower
            )
        );
    };

    // Function to filter followers based on search input
    const filterFollowers = () => {
        if (followers) {
            return followers.filter((t) =>
                t.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        return followers;
    };

    // Add comment to a post
    const addComment = async (postId: number, comment: string) => {
        try {
            // TODO: Implement OrthodoxMetrics comment API
            console.log('Adding comment:', { postId, comment });
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    // Add reply to a comment
    const addReply = async (postId: number, commentId: number, reply: string) => {
        try {
            // TODO: Implement OrthodoxMetrics reply API
            console.log('Adding reply:', { postId, commentId, reply });
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    };

    // Function to toggle like/unlike a post
    const likePost = async (postId: number) => {
        try {
            // TODO: Implement OrthodoxMetrics like API
            console.log('Liking post:', { postId });
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    // Function to toggle like/unlike a reply to a comment
    const likeReply = async (postId: number, commentId: number) => {
        try {
            // TODO: Implement OrthodoxMetrics reply like API
            console.log('Liking reply:', { postId, commentId });
        } catch (error) {
            console.error('Error liking reply:', error);
        }
    };

    // Function to update profile data
    const updateProfileData = (data: Partial<profiledataType>) => {
        const updatedProfile = { ...profileData, ...data };
        setProfileData(updatedProfile);
        
        // Save to localStorage for persistence
        try {
            localStorage.setItem('orthodoxmetrics_profile_data', JSON.stringify(updatedProfile));
        } catch (error) {
            console.error('Error saving profile to localStorage:', error);
        }
        
        // TODO: Add API call to save to backend
        console.log('Updating profile data:', data);
    };

    return (
        <UserDataContext.Provider value={{
            posts,
            users,
            error,
            gallery,
            loading,
            profileData,
            addGalleryItem,
            addReply,
            likePost,
            addComment,
            likeReply,
            followers: filterFollowers(),
            toggleFollow,
            setSearch,
            search,
            updateProfileData
        }}>
            {children}
        </UserDataContext.Provider>
    );
};