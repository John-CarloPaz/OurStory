import {
  Coffee,
  Flag,
  Gift,
  Heart,
  House,
  Landmark,
  Mountain,
  MapPin,
  Moon,
  Plane,
  Sparkles,
  Star,
  Gem,
  type LucideIcon,
} from "lucide-react";

export const MILESTONE_META: Record<string, { label: string; icon: LucideIcon }> = {
  heart: { label: "Heart", icon: Heart },
  star: { label: "Star", icon: Star },
  home: { label: "Home", icon: House },
  ring: { label: "Ring", icon: Gem },
  plane: { label: "Travel", icon: Plane },
  gift: { label: "Gift", icon: Gift },
  sparkles: { label: "Sparkles", icon: Sparkles },
  flag: { label: "Flag", icon: Flag },
};

export const PLACE_META: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Home", icon: House },
  food: { label: "Food & drink", icon: Coffee },
  travel: { label: "Travel", icon: Plane },
  nature: { label: "Nature", icon: Mountain },
  culture: { label: "Culture", icon: Landmark },
  nightlife: { label: "Nights out", icon: Moon },
  other: { label: "Other", icon: MapPin },
};

export function MilestoneIcon({ icon, className = "size-4" }: { icon: string; className?: string }) {
  const Icon = MILESTONE_META[icon]?.icon ?? Heart;
  return <Icon className={className} aria-hidden />;
}

export function PlaceIcon({ category, className = "size-4" }: { category: string; className?: string }) {
  const Icon = PLACE_META[category]?.icon ?? MapPin;
  return <Icon className={className} aria-hidden />;
}
