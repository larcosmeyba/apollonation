import marcos4 from "@/assets/marcos-4.jpg";
import marcos5 from "@/assets/marcos-5.jpg";
import marcos7 from "@/assets/marcos-7.jpg";
import marcos8 from "@/assets/marcos-8.jpg";

const images = [
  { src: marcos4, alt: "Athletic training - sprint" },
  { src: marcos5, alt: "Dynamic movement" },
  { src: marcos7, alt: "Flexibility training" },
  { src: marcos8, alt: "Core workout" },
];

const GallerySection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-widest mb-4 block">
            The Lifestyle
          </span>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            TRAIN LIKE A
            <span className="text-gradient-gold block">GOD</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Dedication. Discipline. Dominance. This is what it means to be part of Apollo Nation.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl group ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                  index === 0 ? 'h-full min-h-[400px]' : 'h-48 md:h-56'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-2xl transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
