export class CourseResponseDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  price: number;
  discountPrice: number | null;
  totalDuration: number;
  totalVideos: number;
  totalQuizzes: number;
  isPublished: boolean;
  instructor: {
    id: string;
    name: string;
    avatar: string | null;
    title: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
}

export class CourseDetailResponseDto extends CourseResponseDto {
  sections: {
    id: string;
    title: string;
    order: number;
    contents: {
      id: string;
      title: string;
      type: string;
      order: number;
      duration: number | null;
    }[];
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    user: {
      id: string;
      name: string | null;
    };
    createdAt: Date;
  }[];
}
