import type { SVGAttributes } from 'react';

export default function SurveyIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* Theodolite / Total Station Icon */}
            <circle cx="12" cy="7" r="3" />
            <path d="M12 4V2" />
            <path d="M9 7H6" />
            <path d="M18 7h-3" />
            <path d="M12 10v3" />
            <path d="M7 21l4-8" />
            <path d="M17 21l-4-8" />
            <path d="M12 13v8" />
            <circle cx="12" cy="7" r="1" fill="currentColor" />
        </svg>
    );
}

