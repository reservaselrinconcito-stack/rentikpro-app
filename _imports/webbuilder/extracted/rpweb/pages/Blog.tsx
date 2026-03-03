import React from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';

const Blog: React.FC = () => {
  return (
    <div className="bg-stone-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl text-stone-900 mb-12">Diario del Matarraña</h1>
        
        <div className="grid md:grid-cols-2 gap-12">
          {BLOG_POSTS.map((post) => (
            <Link to={`/blog/${post.slug}`} key={post.id} className="group block">
              <div className="overflow-hidden rounded-2xl mb-6 shadow-sm">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                 <span className="text-xs font-bold uppercase tracking-wider text-orange-700">{post.category}</span>
                 <span className="text-stone-300">•</span>
                 <span className="text-xs text-stone-500">{post.date}</span>
              </div>
              <h2 className="font-serif text-3xl text-stone-900 mb-3 group-hover:text-orange-800 transition-colors">{post.title}</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <span className="text-sm font-medium text-stone-900 underline decoration-orange-300 decoration-2 underline-offset-4 group-hover:decoration-orange-500">Leer más</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;