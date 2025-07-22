import React from 'react';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  setSelectedTags,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        Filter by Tags:
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {availableTags.map(tag => (
          <label key={tag} style={{ display: "flex", alignItems: "center", marginRight: "1rem" }}>
            <input
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTags([...selectedTags, tag]);
                } else {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                }
              }}
              style={{ marginRight: "0.25rem" }}
            />
            <span style={{ 
              backgroundColor: "#e9ecef", 
              padding: "0.25rem 0.5rem", 
              borderRadius: "4px",
              fontSize: "0.9em"
            }}>
              {tag}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};