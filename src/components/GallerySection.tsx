import fitness4 from "@/assets/fitness-4.png";
import fitness6 from "@/assets/fitness-6.png";
import fitness9 from "@/assets/fitness-9.png";
import fitnessGym from "@/assets/fitness-gym.png";

const images = [
  { src: fitness4, alt: "Athletic training" },
  { src: fitness6, alt: "Muscle definition" },
  { src: fitness9, alt: "Intense workout" },
  { src: fitnessGym, alt: "Training environment" },
];

const GallerySection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-apollo-charcoal-light/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-apollo-gold font-medium text-sm uppercase tracking-widest mb-4 block">
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

        {/* Gallery Grid */}
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
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                  index === 0 ? 'h-full min-h-[400px]' : 'h-48 md:h-56'
                }`}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Gold border on hover */}
              <div className="absolute inset-0 border-2 border-apollo-gold/0 group-hover:border-apollo-gold/50 rounded-2xl transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
